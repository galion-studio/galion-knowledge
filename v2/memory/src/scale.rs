// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

//! Shard-and-core-pack index.
//!
//! A small core pack stays in RAM and is searched first. The rest of the
//! cards live in immutable SQLite FTS5 shards split by section and category.
//! A rare-term lexicon plus a shard centroid routes a query to a few shards.
//! The dense leg inside a shard is IVF with product quantization, then an
//! int8 refine of the short list. Repeated queries hit an LRU cache.
//!
//! `faiss` was not linked: the Rust bindings need the C++ library and a
//! large native build. `hora` exposes IVF-PQ but is unmaintained and brings
//! its own index format. The vectors here are already int8, so the IVF and
//! PQ steps are the standard ones (k-means, then Jégou product quantization)
//! on that int8 space, with the existing cosine as the refine.

use std::collections::{HashMap, VecDeque};
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Instant;

use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::card::Card;
use crate::embed::{cosine, HashingEmbedder, Int8Vec, EMB_DIM};
use crate::error::{Error, Result};
use crate::rrf::fuse;
use crate::store::{match_query, Hit, SearchResponse, Store, MAX_HITS, POOL, RRF_K};
use crate::text::index_tokens;

pub const CATEGORIES: [&str; 12] = [
    "science",
    "history",
    "philosophy",
    "nature",
    "medicine",
    "mathematics",
    "geography",
    "technology",
    "arts",
    "society",
    "law",
    "biology",
];

const NLIST: usize = 64;
const NPROBE: usize = 4;
const M_SUB: usize = 16;
const D_SUB: usize = EMB_DIM / M_SUB;
const K_SUB: usize = 16;
const ROUTED: usize = 3;
const CACHE_CAP: usize = 128;
const TRAIN_CAP: usize = 2_048;
const KMEANS_ITERS: usize = 4;
const REFINE: usize = 32;

const SHARD_SCHEMA: &str = r#"
CREATE TABLE items (
    rowid INTEGER PRIMARY KEY,
    item_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    summary TEXT NOT NULL,
    said_by TEXT NOT NULL,
    source_date TEXT NOT NULL,
    source TEXT NOT NULL,
    emb BLOB NOT NULL,
    emb_scale REAL NOT NULL,
    emb_norm REAL NOT NULL
);
CREATE VIRTUAL TABLE items_fts USING fts5(
    title, summary, body, said_by, source,
    tokenize = 'unicode61'
);
CREATE VIRTUAL TABLE items_fts_vocab USING fts5vocab(items_fts, 'row');
"#;

/// Versioned, immutable list of shard files.
///
/// On device the core pack and the shards a person has chosen are local.
/// Every other shard is only this record: id, sha256, and size. A client
/// can fetch that file from the Galion open network. This crate does not
/// fetch it. A correction publishes a new manifest version. Shard files
/// are not edited in place.
#[derive(Clone, Debug, Serialize, serde::Deserialize)]
pub struct ShardManifest {
    pub schema: String,
    pub version: String,
    pub immutable: bool,
    pub note: String,
    pub core_pack: ManifestFile,
    pub shards: Vec<ManifestFile>,
}

#[derive(Clone, Debug, Serialize, serde::Deserialize)]
pub struct ManifestFile {
    pub id: String,
    pub section: String,
    pub category: String,
    pub sha256: String,
    pub bytes: u64,
}

/// Measured scale-bench summary. Fields are filled from one run.
#[derive(Clone, Debug, Serialize)]
pub struct ScaleReport {
    pub rows: usize,
    pub core_rows: usize,
    pub shard_count: usize,
    pub selective_p50_us: u64,
    pub selective_p95_us: u64,
    pub broad_p50_us: u64,
    pub broad_p95_us: u64,
    pub broad_cached_p50_us: u64,
    pub rss_bytes: u64,
    pub disk_bytes: u64,
    pub queries: usize,
    pub spot_top_id: Option<String>,
    pub spot_said_by: Option<String>,
    pub spot_date: Option<String>,
    pub spot_source: Option<String>,
}

struct Ann {
    centroids: Vec<f32>,
    lists: Vec<Vec<u32>>,
    codes: Vec<u8>,
    codebook: Vec<f32>,
    rowids: Vec<i64>,
}

struct Shard {
    section: String,
    category: String,
    path: PathBuf,
    centroid: Vec<f32>,
    rows: usize,
    ann: Ann,
    conn: Mutex<Connection>,
}

struct Cache {
    cap: usize,
    order: VecDeque<String>,
    map: HashMap<String, SearchResponse>,
}

impl Cache {
    fn new(cap: usize) -> Self {
        Self {
            cap,
            order: VecDeque::new(),
            map: HashMap::new(),
        }
    }

    fn get(&self, key: &str) -> Option<SearchResponse> {
        self.map.get(key).cloned()
    }

    fn insert(&mut self, key: String, value: SearchResponse) {
        if self.map.contains_key(&key) {
            return;
        }
        if self.order.len() == self.cap {
            if let Some(old) = self.order.pop_front() {
                self.map.remove(&old);
            }
        }
        self.order.push_back(key.clone());
        self.map.insert(key, value);
    }

    fn clear(&mut self) {
        self.order.clear();
        self.map.clear();
    }
}

struct ShardWriter {
    section: String,
    category: String,
    path: PathBuf,
    conn: Connection,
    rows: usize,
    tx: usize,
}

impl ShardWriter {
    fn open(root: &Path, section: &str, category: &str) -> Result<Self> {
        let path = root.join(format!("shard-{section}-{category}.sqlite"));
        let conn = Connection::open(&path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        conn.pragma_update(None, "cache_size", -4_000)?;
        conn.execute_batch(SHARD_SCHEMA)?;
        conn.execute_batch("BEGIN")?;
        Ok(Self {
            section: section.to_string(),
            category: category.to_string(),
            path,
            conn,
            rows: 0,
            tx: 0,
        })
    }

    fn insert(&mut self, card: &Card, emb: &Int8Vec) -> Result<()> {
        self.conn.execute(
            "INSERT INTO items (
                item_id, title, body, summary, said_by, source_date, source,
                emb, emb_scale, emb_norm
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                card.id,
                card.title,
                card.body,
                card.summary,
                card.said_by,
                card.date,
                card.source,
                emb.values.iter().map(|b| *b as u8).collect::<Vec<_>>(),
                emb.scale,
                emb.norm,
            ],
        )?;
        let rowid = self.conn.last_insert_rowid();
        self.conn.execute(
            "INSERT INTO items_fts(rowid, title, summary, body, said_by, source)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                rowid,
                fts_field(&card.title),
                fts_field(&card.summary),
                fts_field(&card.body),
                fts_field(&card.said_by),
                fts_field(&card.source),
            ],
        )?;
        self.rows += 1;
        self.tx += 1;
        if self.tx >= 5_000 {
            self.conn.execute_batch("COMMIT")?;
            self.conn.execute_batch("BEGIN")?;
            self.tx = 0;
        }
        Ok(())
    }

    fn finish(self) -> Result<ShardWriter> {
        self.conn.execute_batch("COMMIT")?;
        self.conn
            .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
        Ok(self)
    }
}

/// Core pack plus category shards.
pub struct ScaleIndex {
    root: PathBuf,
    core: Store,
    shards: Vec<Shard>,
    lexicon: HashMap<String, u16>,
    cache: Cache,
    embedder: HashingEmbedder,
    rows: usize,
    core_rows: usize,
}

impl ScaleIndex {
    /// Build a scale index. Core cards (`fact` or `evidence_strength = strong`)
    /// go to the core pack. Every other card goes to a section/category shard.
    pub fn build(root: &Path, cards: impl IntoIterator<Item = Card>) -> Result<Self> {
        if root.exists() {
            fs::remove_dir_all(root)?;
        }
        fs::create_dir_all(root)?;
        let mut core = Store::open(root.join("core.sqlite"))?;
        let embedder = HashingEmbedder;
        let mut writers: HashMap<(String, String), ShardWriter> = HashMap::new();
        let mut core_buf = Vec::new();
        let mut rows = 0usize;
        let mut core_rows = 0usize;
        for card in cards {
            rows += 1;
            if rows % 100_000 == 0 {
                eprintln!("indexed {rows}");
            }
            if is_core(&card) {
                core_rows += 1;
                core_buf.push(card);
                if core_buf.len() >= 256 {
                    core.upsert_cards(&core_buf)?;
                    core_buf.clear();
                }
            } else {
                let emb = embedder.embed(&card.index_text());
                let key = (card.section.clone(), card.category.clone());
                if !writers.contains_key(&key) {
                    writers.insert(
                        key.clone(),
                        ShardWriter::open(root, &card.section, &card.category)?,
                    );
                }
                writers.get_mut(&key).unwrap().insert(&card, &emb)?;
            }
        }
        if !core_buf.is_empty() {
            core.upsert_cards(&core_buf)?;
        }
        let mut shards = Vec::new();
        let mut lexicon = HashMap::new();
        for (_key, writer) in writers {
            let writer = writer.finish()?;
            let shard_index = u16::try_from(shards.len()).unwrap_or(u16::MAX);
            absorb_lexicon(&writer.conn, shard_index, &mut lexicon)?;
            let shard = finish_shard(writer)?;
            shards.push(shard);
        }
        let index = Self {
            root: root.to_path_buf(),
            core,
            shards,
            lexicon,
            cache: Cache::new(CACHE_CAP),
            embedder,
            rows,
            core_rows,
        };
        index.write_manifest()?;
        Ok(index)
    }

    pub fn rows(&self) -> usize {
        self.rows
    }

    pub fn core_rows(&self) -> usize {
        self.core_rows
    }

    pub fn clear_cache(&mut self) {
        self.cache.clear();
    }

    pub fn search(&mut self, query: &str) -> Result<SearchResponse> {
        let started = Instant::now();
        if let Some(mut hit) = self.cache.get(query) {
            hit.took_us = micros(started);
            return Ok(hit);
        }
        let mut response = self.search_cold(query)?;
        response.took_us = micros(started);
        self.cache.insert(query.to_string(), response.clone());
        Ok(response)
    }

    /// Search with the cache ignored. Used to time the index itself.
    pub fn search_cold(&self, query: &str) -> Result<SearchResponse> {
        let started = Instant::now();
        let q = self.embedder.embed(query);
        let mut core = self.core.search(query)?;
        let chosen = self.route(query, &q);
        let lexicon_routed = index_tokens(query)
            .iter()
            .any(|term| self.lexicon.contains_key(term));
        if lexicon_routed {
            let terms = index_tokens(query);
            core.hits.retain(|hit| {
                let hay = hit.text.to_lowercase();
                terms.iter().any(|term| hay.contains(term))
            });
        }
        let mut lists: Vec<Vec<String>> = Vec::new();
        let mut by_id: HashMap<String, Hit> = HashMap::new();
        if !core.hits.is_empty() {
            lists.push(core.hits.iter().map(|h| h.item_id.clone()).collect());
            for hit in core.hits {
                by_id.insert(hit.item_id.clone(), hit);
            }
        }
        let shard_hits = search_shards(&self.shards, &chosen, query, &q)?;
        for hits in shard_hits {
            if hits.is_empty() {
                continue;
            }
            lists.push(hits.iter().map(|h| h.item_id.clone()).collect());
            for hit in hits {
                by_id.entry(hit.item_id.clone()).or_insert(hit);
            }
        }
        let terms = index_tokens(query);
        if terms
            .iter()
            .any(|term| by_id.values().any(|hit| hit_mentions(hit, term)))
        {
            for list in &mut lists {
                list.retain(|id| {
                    by_id
                        .get(id)
                        .is_some_and(|hit| terms.iter().any(|term| hit_mentions(hit, term)))
                });
            }
            lists.retain(|list| !list.is_empty());
        }
        let fused = fuse(&lists, RRF_K);
        let mut hits = Vec::new();
        for (id, score) in fused.into_iter().take(MAX_HITS) {
            if let Some(mut hit) = by_id.remove(&id) {
                hit.score = score;
                hits.push(hit);
            }
        }
        Ok(SearchResponse {
            query: query.to_string(),
            hits,
            took_us: micros(started),
        })
    }

    pub fn disk_bytes(&self) -> Result<u64> {
        dir_bytes(&self.root)
    }

    pub fn manifest(&self) -> Result<ShardManifest> {
        let path = self.root.join("manifest.json");
        let raw = fs::read_to_string(path)?;
        Ok(serde_json::from_str(&raw)?)
    }

    fn route(&self, query: &str, q: &Int8Vec) -> Vec<usize> {
        let mut chosen = Vec::new();
        for term in index_tokens(query) {
            if let Some(idx) = self.lexicon.get(&term) {
                let idx = *idx as usize;
                if !chosen.contains(&idx) {
                    chosen.push(idx);
                }
            }
        }
        // A rare term names its shard. Extra centroid shards would tie that hit.
        if !chosen.is_empty() {
            chosen.truncate(ROUTED);
            return chosen;
        }
        if !self.shards.is_empty() {
            let mut scored: Vec<(usize, f32)> = self
                .shards
                .iter()
                .enumerate()
                .map(|(i, shard)| (i, centroid_score(q, &shard.centroid)))
                .collect();
            scored.sort_by(|a, b| b.1.total_cmp(&a.1));
            for (idx, _) in scored.into_iter().take(ROUTED) {
                chosen.push(idx);
            }
        }
        chosen
    }

    fn write_manifest(&self) -> Result<()> {
        let mut shards = Vec::new();
        for shard in &self.shards {
            let (sha, bytes) = hash_file(&shard.path)?;
            shards.push(ManifestFile {
                id: format!("{}-{}", shard.section, shard.category),
                section: shard.section.clone(),
                category: shard.category.clone(),
                sha256: sha,
                bytes,
            });
        }
        let core_path = self.root.join("core.sqlite");
        let (sha, bytes) = hash_file(&core_path)?;
        let manifest = ShardManifest {
            schema: "galion-shard-manifest/1".into(),
            version: "1".into(),
            immutable: true,
            note: "On device, keep the core pack and the shards you chose. Fetch any other shard by sha256 from the Galion open network. Do not edit a shard file; publish a new manifest version.".into(),
            core_pack: ManifestFile {
                id: "core".into(),
                section: "core".into(),
                category: "core".into(),
                sha256: sha,
                bytes,
            },
            shards,
        };
        fs::write(
            self.root.join("manifest.json"),
            serde_json::to_string_pretty(&manifest)?,
        )?;
        Ok(())
    }
}

fn hit_mentions(hit: &Hit, term: &str) -> bool {
    let title = hit.title.to_lowercase();
    let text = hit.text.to_lowercase();
    title.contains(term) || text.contains(term)
}

fn is_core(card: &Card) -> bool {
    card.claim_type == "fact" || card.evidence_strength == "strong"
}

fn finish_shard(writer: ShardWriter) -> Result<Shard> {
    let n = writer.rows;
    let ann = if n == 0 {
        Ann {
            centroids: Vec::new(),
            lists: Vec::new(),
            codes: Vec::new(),
            codebook: Vec::new(),
            rowids: Vec::new(),
        }
    } else {
        build_ann(&writer.conn, n)?
    };
    let centroid = mean_centroid(&writer.conn)?;
    let conn = writer.conn;
    Ok(Shard {
        section: writer.section,
        category: writer.category,
        path: writer.path,
        centroid,
        rows: n,
        ann,
        conn: Mutex::new(conn),
    })
}

fn build_ann(conn: &Connection, n: usize) -> Result<Ann> {
    let sample = sample_vectors(conn, TRAIN_CAP.min(n))?;
    let sample_n = sample.len() / EMB_DIM;
    let nlist = NLIST.min(sample_n.max(1));
    let centroids = if sample_n == 0 {
        vec![0f32; EMB_DIM]
    } else {
        kmeans(&sample, sample_n, nlist, EMB_DIM, KMEANS_ITERS)
    };
    let codebook = train_codebook(&sample, sample_n);
    let mut lists = vec![Vec::new(); nlist];
    let mut codes = Vec::with_capacity(n * M_SUB);
    let mut rowids = Vec::with_capacity(n);
    let mut stmt = conn.prepare("SELECT rowid, emb FROM items ORDER BY rowid")?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, Vec<u8>>(1)?))
    })?;
    for row in rows {
        let (rowid, blob) = row?;
        if blob.len() != EMB_DIM {
            continue;
        }
        let point = bytes_as_f32(&blob);
        let cluster = nearest(&point, &centroids, nlist, EMB_DIM);
        let local = u32::try_from(rowids.len()).unwrap_or(u32::MAX);
        lists[cluster].push(local);
        codes.extend(encode_pq(&point, &codebook));
        rowids.push(rowid);
    }
    Ok(Ann {
        centroids,
        lists,
        codes,
        codebook,
        rowids,
    })
}

fn sample_vectors(conn: &Connection, cap: usize) -> Result<Vec<f32>> {
    let mut stmt = conn.prepare("SELECT emb FROM items ORDER BY rowid")?;
    let rows = stmt.query_map([], |row| row.get::<_, Vec<u8>>(0))?;
    let mut out = Vec::new();
    for row in rows {
        let blob = row?;
        if blob.len() != EMB_DIM || out.len() / EMB_DIM >= cap {
            if out.len() / EMB_DIM >= cap {
                break;
            }
            continue;
        }
        out.extend(bytes_as_f32(&blob));
    }
    Ok(out)
}

fn mean_centroid(conn: &Connection) -> Result<Vec<f32>> {
    let sample = sample_vectors(conn, 512)?;
    let n = sample.len() / EMB_DIM;
    let mut mean = vec![0f32; EMB_DIM];
    if n == 0 {
        return Ok(mean);
    }
    for row in sample.chunks(EMB_DIM) {
        for (i, v) in row.iter().enumerate() {
            mean[i] += *v;
        }
    }
    let inv = 1.0 / n as f32;
    for v in &mut mean {
        *v *= inv;
    }
    Ok(mean)
}

fn absorb_lexicon(conn: &Connection, shard: u16, lexicon: &mut HashMap<String, u16>) -> Result<()> {
    let mut stmt = conn.prepare(
        "SELECT term FROM items_fts_vocab WHERE doc = 1 AND length(term) BETWEEN 2 AND 24",
    )?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    for row in rows {
        let term = row?;
        lexicon.entry(term).or_insert(shard);
    }
    Ok(())
}

fn search_shards(
    shards: &[Shard],
    chosen: &[usize],
    query: &str,
    q: &Int8Vec,
) -> Result<Vec<Vec<Hit>>> {
    let mut out = Vec::with_capacity(chosen.len());
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::scope(|scope| {
        for idx in chosen {
            let shard = &shards[*idx];
            let tx = tx.clone();
            let query = query.to_string();
            let q = q.clone();
            scope.spawn(move || {
                let result = search_one(shard, &query, &q);
                let _ = tx.send(result);
            });
        }
    });
    drop(tx);
    for result in rx {
        out.push(result?);
    }
    Ok(out)
}

fn search_one(shard: &Shard, query: &str, q: &Int8Vec) -> Result<Vec<Hit>> {
    let conn = shard
        .conn
        .lock()
        .map_err(|_| Error::Invalid("shard connection lock".into()))?;
    let lexical = lexical_ids(&conn, shard.rows as i64, query)?;
    let dense = dense_ids(&conn, &shard.ann, q)?;
    // A rare lexical hit is counted twice so it outranks a tied vector neighbor.
    let lists = [lexical.clone(), lexical, dense];
    let fused = fuse(&lists, RRF_K);
    let mut hits = Vec::new();
    for (id, score) in fused.into_iter().take(POOL) {
        if let Some(mut hit) = hydrate(&conn, &id)? {
            hit.score = score;
            hits.push(hit);
        }
    }
    Ok(hits)
}

fn lexical_ids(conn: &Connection, n: i64, query: &str) -> Result<Vec<String>> {
    let Some(match_q) = match_query(conn, n, query)? else {
        return Ok(Vec::new());
    };
    let mut stmt = conn.prepare(
        "SELECT item_id FROM items_fts
         JOIN items ON items.rowid = items_fts.rowid
         WHERE items_fts MATCH ?1
         ORDER BY rank
         LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![match_q, POOL as i64], |row| row.get::<_, String>(0))?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

fn dense_ids(conn: &Connection, ann: &Ann, q: &Int8Vec) -> Result<Vec<String>> {
    if ann.rowids.is_empty() || q.norm == 0.0 {
        return Ok(Vec::new());
    }
    let qf = q.values.iter().map(|v| *v as f32).collect::<Vec<_>>();
    let nlist = ann.lists.len().max(1);
    let mut probes: Vec<(usize, f32)> = (0..ann.lists.len())
        .map(|i| {
            let cent = &ann.centroids[i * EMB_DIM..(i + 1) * EMB_DIM];
            (i, l2sq(&qf, cent))
        })
        .collect();
    probes.sort_by(|a, b| a.1.total_cmp(&b.1));
    probes.truncate(NPROBE.min(nlist));
    let tables = adc_tables(&qf, &ann.codebook);
    let mut short: Vec<(u32, f32)> = Vec::new();
    for (cluster, _) in probes {
        for local in &ann.lists[cluster] {
            let start = *local as usize * M_SUB;
            if start + M_SUB > ann.codes.len() {
                continue;
            }
            let dist = code_dist(&tables, &ann.codes[start..start + M_SUB]);
            if short.len() < REFINE {
                short.push((*local, dist));
            } else {
                let mut worst_at = 0usize;
                let mut worst_d = f32::MIN;
                for (j, (_, d)) in short.iter().enumerate() {
                    if *d > worst_d {
                        worst_d = *d;
                        worst_at = j;
                    }
                }
                if dist < worst_d {
                    short[worst_at] = (*local, dist);
                }
            }
        }
    }
    short.sort_by(|a, b| a.1.total_cmp(&b.1));
    let mut refined: Vec<(String, f32)> = Vec::new();
    for (local, _) in short.into_iter().take(REFINE) {
        let rowid = ann.rowids[local as usize];
        let row: Option<(Vec<u8>, f32, f32, String)> = conn
            .query_row(
                "SELECT emb, emb_scale, emb_norm, item_id FROM items WHERE rowid = ?1",
                params![rowid],
                |row| {
                    Ok((
                        row.get::<_, Vec<u8>>(0)?,
                        row.get::<_, f32>(1)?,
                        row.get::<_, f32>(2)?,
                        row.get::<_, String>(3)?,
                    ))
                },
            )
            .optional()?;
        let Some((blob, scale, norm, item_id)) = row else {
            continue;
        };
        let values: Vec<i8> = blob.into_iter().map(|b| b as i8).collect();
        let score = cosine(q, &values, scale, norm);
        if score > 0.0 {
            refined.push((item_id, score));
        }
    }
    refined.sort_by(|a, b| b.1.total_cmp(&a.1));
    Ok(refined.into_iter().take(POOL).map(|(id, _)| id).collect())
}

fn hydrate(conn: &Connection, item_id: &str) -> Result<Option<Hit>> {
    let row = conn
        .query_row(
            "SELECT title, summary, body, said_by, source_date, source FROM items WHERE item_id = ?1",
            params![item_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                ))
            },
        )
        .optional()?;
    let Some((title, summary, body, said_by, date, source)) = row else {
        return Ok(None);
    };
    let text = if !summary.is_empty() { summary } else { body };
    Ok(Some(Hit {
        item_id: item_id.to_string(),
        layer: "shard".into(),
        title,
        text,
        said_by: unknown(said_by),
        date: unknown(date),
        source: unknown(source),
        score: 0.0,
    }))
}

fn train_codebook(sample: &[f32], n: usize) -> Vec<f32> {
    let mut book = vec![0f32; M_SUB * K_SUB * D_SUB];
    if n == 0 {
        return book;
    }
    for s in 0..M_SUB {
        let mut points = Vec::with_capacity(n * D_SUB);
        for row in 0..n {
            let start = row * EMB_DIM + s * D_SUB;
            points.extend_from_slice(&sample[start..start + D_SUB]);
        }
        let cents = kmeans(&points, n, K_SUB.min(n), D_SUB, KMEANS_ITERS);
        let dest = s * K_SUB * D_SUB;
        let take = cents.len().min(K_SUB * D_SUB);
        book[dest..dest + take].copy_from_slice(&cents[..take]);
    }
    book
}

fn encode_pq(point: &[f32], codebook: &[f32]) -> Vec<u8> {
    let mut code = vec![0u8; M_SUB];
    for s in 0..M_SUB {
        let sub = &point[s * D_SUB..(s + 1) * D_SUB];
        let mut best = 0usize;
        let mut best_d = f32::MAX;
        for k in 0..K_SUB {
            let start = (s * K_SUB + k) * D_SUB;
            let dist = l2sq(sub, &codebook[start..start + D_SUB]);
            if dist < best_d {
                best_d = dist;
                best = k;
            }
        }
        code[s] = best as u8;
    }
    code
}

fn adc_tables(query: &[f32], codebook: &[f32]) -> Vec<f32> {
    let mut tables = vec![0f32; M_SUB * K_SUB];
    for s in 0..M_SUB {
        let sub = &query[s * D_SUB..(s + 1) * D_SUB];
        for k in 0..K_SUB {
            let start = (s * K_SUB + k) * D_SUB;
            tables[s * K_SUB + k] = l2sq(sub, &codebook[start..start + D_SUB]);
        }
    }
    tables
}

fn code_dist(tables: &[f32], code: &[u8]) -> f32 {
    let mut dist = 0f32;
    for s in 0..M_SUB {
        dist += tables[s * K_SUB + code[s] as usize];
    }
    dist
}

fn kmeans(points: &[f32], n: usize, k: usize, dim: usize, iters: usize) -> Vec<f32> {
    let k = k.max(1).min(n.max(1));
    let mut cents = vec![0f32; k * dim];
    if n == 0 {
        return cents;
    }
    for i in 0..k {
        let src = (i * n / k) * dim;
        cents[i * dim..(i + 1) * dim].copy_from_slice(&points[src..src + dim]);
    }
    let mut assign = vec![0usize; n];
    for _ in 0..iters {
        for p in 0..n {
            assign[p] = nearest(&points[p * dim..(p + 1) * dim], &cents, k, dim);
        }
        let mut sum = vec![0f32; k * dim];
        let mut count = vec![0u32; k];
        for p in 0..n {
            let c = assign[p];
            count[c] += 1;
            for d in 0..dim {
                sum[c * dim + d] += points[p * dim + d];
            }
        }
        for c in 0..k {
            if count[c] == 0 {
                continue;
            }
            let inv = 1.0 / count[c] as f32;
            for d in 0..dim {
                cents[c * dim + d] = sum[c * dim + d] * inv;
            }
        }
    }
    cents
}

fn nearest(point: &[f32], cents: &[f32], k: usize, dim: usize) -> usize {
    let mut best = 0usize;
    let mut best_d = f32::MAX;
    for c in 0..k {
        let dist = l2sq(point, &cents[c * dim..(c + 1) * dim]);
        if dist < best_d {
            best_d = dist;
            best = c;
        }
    }
    best
}

fn l2sq(a: &[f32], b: &[f32]) -> f32 {
    let mut sum = 0f32;
    for (x, y) in a.iter().zip(b.iter()) {
        let d = x - y;
        sum += d * d;
    }
    sum
}

fn bytes_as_f32(blob: &[u8]) -> Vec<f32> {
    blob.iter().map(|b| *b as i8 as f32).collect()
}

fn centroid_score(q: &Int8Vec, centroid: &[f32]) -> f32 {
    if centroid.len() != EMB_DIM || q.norm == 0.0 {
        return 0.0;
    }
    let mut dot = 0f32;
    for (a, b) in q.values.iter().zip(centroid.iter()) {
        dot += *a as f32 * *b;
    }
    dot
}

fn fts_field(raw: &str) -> String {
    index_tokens(raw).join(" ")
}

fn unknown(value: String) -> String {
    if value.trim().is_empty() {
        "unknown".into()
    } else {
        value
    }
}

fn micros(started: Instant) -> u32 {
    u32::try_from(started.elapsed().as_micros()).unwrap_or(u32::MAX)
}

fn hash_file(path: &Path) -> Result<(String, u64)> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    let mut bytes = 0u64;
    loop {
        let n = file.read(&mut buf)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
        bytes += n as u64;
    }
    Ok((hex(&hasher.finalize()), bytes))
}

fn hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        out.push(HEX[(b >> 4) as usize] as char);
        out.push(HEX[(b & 0x0f) as usize] as char);
    }
    out
}

fn dir_bytes(root: &Path) -> Result<u64> {
    let mut total = 0u64;
    for entry in fs::read_dir(root)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() {
            total += entry.metadata()?.len();
        }
    }
    Ok(total)
}

/// Resident set size of this process, from `/proc/self/status`.
pub fn rss_bytes() -> u64 {
    let Ok(text) = fs::read_to_string("/proc/self/status") else {
        return 0;
    };
    for line in text.lines() {
        if let Some(rest) = line.strip_prefix("VmRSS:") {
            let kb: u64 = rest
                .split_whitespace()
                .next()
                .unwrap_or("0")
                .parse()
                .unwrap_or(0);
            return kb * 1024;
        }
    }
    0
}

#[cfg(test)]
mod tests {
    use super::*;

    fn card(i: usize, category: &str, fact: bool) -> Card {
        let raw = serde_json::json!({
            "id": format!("s{i}"),
            "title": format!("card {i}"),
            "section": "world",
            "category": category,
            "summary": format!("sample note uniq{i} in {category}"),
            "body": format!("sample body uniq{i}"),
            "claim_type": if fact { "fact" } else { "opinion" },
            "evidence_strength": if fact { "strong" } else { "none" },
            "said_by": "Galion Labs",
            "as_of_date": "2026-11-18",
            "sources": [{
                "title": "scale fixture",
                "url": format!("https://example.test/s{i}"),
                "author": "Galion Labs",
                "date": "2026-11-18"
            }],
            "status": "draft"
        });
        crate::parse_cards(&raw, "world/card.json")
            .unwrap()
            .pop()
            .unwrap()
    }

    #[test]
    fn routes_a_rare_marker_and_keeps_provenance() {
        let dir = std::env::temp_dir().join(format!("horbm-scale-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        let mut cards = Vec::new();
        for i in 0..36 {
            let category = CATEGORIES[i % 4];
            cards.push(card(i, category, i == 0));
        }
        let mut index = ScaleIndex::build(&dir, cards).unwrap();
        assert!(index.rows() >= 36);
        let cold = index.search_cold("uniq7").unwrap();
        assert_eq!(cold.hits[0].item_id, "s7");
        assert_eq!(cold.hits[0].said_by, "Galion Labs");
        assert_eq!(cold.hits[0].date, "2026-11-18");
        assert!(cold.hits[0].source.contains("example.test"));
        assert!(cold.hits.len() <= MAX_HITS);
        let first = index.search("uniq7").unwrap();
        let second = index.search("uniq7").unwrap();
        assert_eq!(first.hits[0].item_id, second.hits[0].item_id);
        let manifest = index.manifest().unwrap();
        assert_eq!(manifest.schema, "galion-shard-manifest/1");
        assert!(manifest.immutable);
        assert!(!manifest.core_pack.sha256.is_empty());
        drop(index);
        let _ = fs::remove_dir_all(&dir);
    }
}
