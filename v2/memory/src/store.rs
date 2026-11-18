// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

use crate::card::{parse_cards, Card};
use crate::embed::{cosine, dot_i8, HashingEmbedder, Int8Vec, EMB_DIM};
use crate::error::{Error, Result};
use crate::rrf::fuse;
use crate::session::{SessionRing, Turn};
use crate::text::{fts_match_query, tokens};

/// Published hits. HORBM R1's voice packet is four.
pub const MAX_HITS: usize = 4;
/// Internal pool each leg may contribute before fusion.
pub const POOL: usize = 32;
/// Cormack, Clarke, and Büttcher, SIGIR 2009. The constant the V2 plan uses.
pub const RRF_K: f32 = 60.0;
/// Short-term ring capacity.
pub const RING_CAP: usize = 32;

pub const LAYER_SEMANTIC: &str = "semantic";
pub const LAYER_EPISODE: &str = "episode";
pub const LAYER_DIARY: &str = "diary";

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS items (
    rowid INTEGER PRIMARY KEY,
    item_id TEXT NOT NULL UNIQUE,
    layer TEXT NOT NULL CHECK (layer IN ('semantic', 'episode', 'diary')),
    section TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    claim_type TEXT NOT NULL DEFAULT '',
    said_by TEXT NOT NULL,
    source_date TEXT NOT NULL,
    source TEXT NOT NULL,
    evidence_strength TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '',
    marked INTEGER NOT NULL DEFAULT 0,
    emb BLOB NOT NULL,
    emb_scale REAL NOT NULL,
    emb_norm REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS items_layer ON items(layer);
CREATE TABLE IF NOT EXISTS meta (
    k TEXT PRIMARY KEY,
    v INTEGER NOT NULL
);
INSERT OR IGNORE INTO meta(k, v) VALUES ('seq', 0);
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    title,
    summary,
    body,
    said_by,
    source,
    tokenize = 'porter unicode61'
);
CREATE TABLE IF NOT EXISTS archive (
    rowid INTEGER PRIMARY KEY,
    item_id TEXT NOT NULL,
    layer TEXT NOT NULL,
    section TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    claim_type TEXT NOT NULL DEFAULT '',
    said_by TEXT NOT NULL,
    source_date TEXT NOT NULL,
    source TEXT NOT NULL,
    evidence_strength TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL,
    emb BLOB NOT NULL,
    emb_scale REAL NOT NULL,
    emb_norm REAL NOT NULL
);
"#;

const SCHEMA_VERSION: i32 = 2;

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct Hit {
    pub item_id: String,
    pub layer: String,
    pub title: String,
    pub text: String,
    pub said_by: String,
    pub date: String,
    pub source: String,
    pub score: f32,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct SearchResponse {
    pub query: String,
    pub hits: Vec<Hit>,
    pub took_us: u32,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct DiaryEntry {
    pub item_id: String,
    pub date: String,
    pub said_by: String,
    pub source: String,
    pub text: String,
    pub marked: bool,
}

/// A stored row an admin `forget` moved out of retrieval.
/// The text is kept. Search does not read this table.
#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct ArchivedRow {
    pub item_id: String,
    pub layer: String,
    pub text: String,
    pub said_by: String,
    pub date: String,
    pub source: String,
    pub reason: String,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct IngestReport {
    pub files_read: usize,
    pub upserted: usize,
    pub skipped: Vec<String>,
}

struct Arena {
    rowid: Vec<i64>,
    item_id: Vec<String>,
    scale: Vec<f32>,
    norm: Vec<f32>,
    /// Contiguous int8 matrix, stride [`EMB_DIM`].
    emb: Vec<i8>,
}

impl Arena {
    fn empty() -> Self {
        Self {
            rowid: Vec::new(),
            item_id: Vec::new(),
            scale: Vec::new(),
            norm: Vec::new(),
            emb: Vec::new(),
        }
    }

    fn len(&self) -> usize {
        self.rowid.len()
    }
}

/// One SQLite file: semantic cards, remembered episodes, and the diary.
pub struct Store {
    conn: Connection,
    arena: Arena,
    ring: SessionRing,
    embedder: HashingEmbedder,
}

impl Store {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        if let Some(parent) = path.as_ref().parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent)?;
            }
        }
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        conn.busy_timeout(std::time::Duration::from_millis(2_000))?;
        let version: i32 = conn.pragma_query_value(None, "user_version", |r| r.get(0))?;
        if version == 0 || version == 1 {
            conn.execute_batch(SCHEMA)?;
            conn.pragma_update(None, "user_version", SCHEMA_VERSION)?;
        } else if version != SCHEMA_VERSION {
            return Err(Error::Invalid(format!(
                "unsupported memory database version {version}"
            )));
        }
        let mut store = Self {
            conn,
            arena: Arena::empty(),
            ring: SessionRing::new(RING_CAP),
            embedder: HashingEmbedder,
        };
        store.reload_arena()?;
        Ok(store)
    }

    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch(SCHEMA)?;
        conn.pragma_update(None, "user_version", SCHEMA_VERSION)?;
        let mut store = Self {
            conn,
            arena: Arena::empty(),
            ring: SessionRing::new(RING_CAP),
            embedder: HashingEmbedder,
        };
        store.reload_arena()?;
        Ok(store)
    }

    /// Push a turn into RAM. Nothing is written to disk.
    pub fn push_turn(
        &mut self,
        text: impl Into<String>,
        said_by: impl Into<String>,
        date: impl Into<String>,
    ) -> Turn {
        self.ring.push(text, said_by, date)
    }

    pub fn session_len(&self) -> usize {
        self.ring.len()
    }

    /// Ingest every `*.json` file under `dir`. Card files upsert. JSON that
    /// is not a card is skipped and named in the report.
    pub fn ingest_dir(&mut self, dir: impl AsRef<Path>) -> Result<IngestReport> {
        let dir = dir.as_ref();
        if !dir.is_dir() {
            return Err(Error::Invalid(format!(
                "{} is not a directory",
                dir.display()
            )));
        }
        let mut files = Vec::new();
        collect_json(dir, &mut files)?;
        files.sort();
        let report = self.in_tx(|store| {
            let mut report = IngestReport {
                files_read: 0,
                upserted: 0,
                skipped: Vec::new(),
            };
            for path in &files {
                let raw = fs::read_to_string(path)?;
                let value: serde_json::Value = serde_json::from_str(&raw)
                    .map_err(|e| Error::Invalid(format!("{}: {e}", path.display())))?;
                report.files_read += 1;
                let hint = path.to_string_lossy().to_string();
                let cards = parse_cards(&value, &hint)?;
                if cards.is_empty() {
                    report.skipped.push(hint);
                    continue;
                }
                for card in cards {
                    store.upsert_card_tx(&card)?;
                    report.upserted += 1;
                }
            }
            Ok(report)
        })?;
        self.reload_arena()?;
        Ok(report)
    }

    pub fn upsert_card(&mut self, card: &Card) -> Result<()> {
        self.upsert_cards(std::slice::from_ref(card))
    }

    pub fn upsert_cards(&mut self, cards: &[Card]) -> Result<()> {
        self.in_tx(|store| {
            for card in cards {
                store.upsert_card_tx(card)?;
            }
            Ok(())
        })?;
        self.reload_arena()?;
        Ok(())
    }

    /// Persist one episode. This is the only way a turn becomes durable.
    pub fn remember(
        &mut self,
        text: &str,
        said_by: &str,
        date: &str,
        source: &str,
    ) -> Result<String> {
        require_fields(text, said_by, date, source)?;
        let emb = self.embedder.embed(text);
        let id = self.in_tx(|store| {
            let id = store.next_id("ep")?;
            store.insert_item(
                &id,
                LAYER_EPISODE,
                "memory",
                "episode",
                "",
                text,
                text,
                "user-said",
                said_by,
                date,
                source,
                "",
                "",
                &emb,
            )?;
            Ok(id)
        })?;
        self.reload_arena()?;
        Ok(id)
    }

    /// Append one diary entry. There is no update path.
    pub fn diary_add(
        &mut self,
        text: &str,
        date: &str,
        said_by: &str,
        source: &str,
    ) -> Result<String> {
        let said_by = if said_by.is_empty() { "HORBM" } else { said_by };
        let source = if source.is_empty() { "diary" } else { source };
        require_fields(text, said_by, date, source)?;
        let emb = self.embedder.embed(text);
        let id = self.in_tx(|store| {
            let id = store.next_id("diary")?;
            store.insert_item(
                &id,
                LAYER_DIARY,
                "diary",
                "entry",
                date,
                text,
                text,
                "user-said",
                said_by,
                date,
                source,
                "",
                "",
                &emb,
            )?;
            Ok(id)
        })?;
        self.reload_arena()?;
        Ok(id)
    }

    pub fn diary_list(&self) -> Result<Vec<DiaryEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT item_id, source_date, said_by, source, body, marked
             FROM items WHERE layer = 'diary' ORDER BY rowid ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(DiaryEntry {
                item_id: row.get(0)?,
                date: row.get(1)?,
                said_by: row.get(2)?,
                source: row.get(3)?,
                text: row.get(4)?,
                marked: row.get::<_, i64>(5)? != 0,
            })
        })?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    /// Keep the row, drop it from retrieval.
    pub fn mark(&mut self, item_id: &str) -> Result<()> {
        let rowid = self.rowid_of(item_id)?;
        self.in_tx(|store| {
            store.conn.execute(
                "UPDATE items SET marked = 1 WHERE rowid = ?1",
                params![rowid],
            )?;
            store
                .conn
                .execute("DELETE FROM items_fts WHERE rowid = ?1", params![rowid])?;
            Ok(())
        })?;
        self.reload_arena()?;
        Ok(())
    }

    /// Admin tool. Hide one stored row. The text moves to `archive` and
    /// leaves the retrieval index. The JSON card on disk is not touched.
    pub fn forget(&mut self, item_id: &str) -> Result<()> {
        let rowid = self.rowid_of(item_id)?;
        self.in_tx(|store| store.archive_live_row(rowid, "forget"))?;
        self.reload_arena()?;
        Ok(())
    }

    /// Rows held out of retrieval. Order is archive insertion order.
    pub fn archive_list(&self) -> Result<Vec<ArchivedRow>> {
        let mut stmt = self.conn.prepare(
            "SELECT item_id, layer, body, said_by, source_date, source, reason
             FROM archive ORDER BY rowid ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(ArchivedRow {
                item_id: row.get(0)?,
                layer: row.get(1)?,
                text: row.get(2)?,
                said_by: row.get(3)?,
                date: row.get(4)?,
                source: row.get(5)?,
                reason: row.get(6)?,
            })
        })?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    pub fn search(&self, query: &str) -> Result<SearchResponse> {
        let started = Instant::now();
        let lexical = self.lexical_ids(query)?;
        let dense = self.dense_ids(query);
        let ring_lex = self.ring_lexical_ids(query);
        let fused = fuse(&[lexical, dense, ring_lex], RRF_K);
        let mut hits = Vec::with_capacity(MAX_HITS);
        for (id, score) in fused.into_iter().take(MAX_HITS) {
            if let Some(hit) = self.hydrate(&id, score)? {
                hits.push(hit);
            }
        }
        let took_us = u32::try_from(started.elapsed().as_micros()).unwrap_or(u32::MAX);
        Ok(SearchResponse {
            query: query.to_string(),
            hits,
            took_us,
        })
    }

    pub fn active_count(&self) -> Result<usize> {
        let n: i64 =
            self.conn
                .query_row("SELECT COUNT(*) FROM items WHERE marked = 0", [], |r| {
                    r.get(0)
                })?;
        Ok(n as usize)
    }

    fn upsert_card_tx(&self, card: &Card) -> Result<()> {
        let emb = self.embedder.embed(&card.index_text());
        if let Some(rowid) = self.existing_rowid(&card.id)? {
            self.conn
                .execute("DELETE FROM items_fts WHERE rowid = ?1", params![rowid])?;
            self.conn.execute(
                "UPDATE items SET
                    layer = 'semantic', section = ?1, category = ?2, title = ?3,
                    body = ?4, summary = ?5, claim_type = ?6, said_by = ?7,
                    source_date = ?8, source = ?9, evidence_strength = ?10,
                    status = ?11, marked = 0, emb = ?12, emb_scale = ?13, emb_norm = ?14
                 WHERE rowid = ?15",
                params![
                    card.section,
                    card.category,
                    card.title,
                    card.body,
                    card.summary,
                    card.claim_type,
                    card.said_by,
                    card.date,
                    card.source,
                    card.evidence_strength,
                    card.status,
                    as_blob(&emb),
                    emb.scale,
                    emb.norm,
                    rowid,
                ],
            )?;
            self.insert_fts(
                rowid,
                &card.title,
                &card.summary,
                &card.body,
                &card.said_by,
                &card.source,
            )?;
        } else {
            self.insert_item(
                &card.id,
                LAYER_SEMANTIC,
                &card.section,
                &card.category,
                &card.title,
                &card.body,
                &card.summary,
                &card.claim_type,
                &card.said_by,
                &card.date,
                &card.source,
                &card.evidence_strength,
                &card.status,
                &emb,
            )?;
        }
        Ok(())
    }

    fn insert_item(
        &self,
        item_id: &str,
        layer: &str,
        section: &str,
        category: &str,
        title: &str,
        body: &str,
        summary: &str,
        claim_type: &str,
        said_by: &str,
        date: &str,
        source: &str,
        evidence_strength: &str,
        status: &str,
        emb: &Int8Vec,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO items (
                item_id, layer, section, category, title, body, summary, claim_type,
                said_by, source_date, source, evidence_strength, status, marked,
                emb, emb_scale, emb_norm
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 0, ?14, ?15, ?16)",
            params![
                item_id,
                layer,
                section,
                category,
                title,
                body,
                summary,
                claim_type,
                said_by,
                date,
                source,
                evidence_strength,
                status,
                as_blob(emb),
                emb.scale,
                emb.norm,
            ],
        )?;
        let rowid = self.conn.last_insert_rowid();
        self.insert_fts(rowid, title, summary, body, said_by, source)?;
        Ok(())
    }

    fn insert_fts(
        &self,
        rowid: i64,
        title: &str,
        summary: &str,
        body: &str,
        said_by: &str,
        source: &str,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO items_fts(rowid, title, summary, body, said_by, source)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![rowid, title, summary, body, said_by, source],
        )?;
        Ok(())
    }

    fn lexical_ids(&self, query: &str) -> Result<Vec<String>> {
        let Some(match_q) = fts_match_query(query) else {
            return Ok(Vec::new());
        };
        let mut stmt = self.conn.prepare(
            "SELECT items.item_id
             FROM items_fts
             JOIN items ON items.rowid = items_fts.rowid
             WHERE items_fts MATCH ?1 AND items.marked = 0
             ORDER BY bm25(items_fts)
             LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![match_q, POOL as i64], |row| row.get::<_, String>(0))?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    fn dense_ids(&self, query: &str) -> Vec<String> {
        let q = self.embedder.embed(query);
        if q.norm == 0.0 {
            return Vec::new();
        }
        let mut qv = [0i8; EMB_DIM];
        qv.copy_from_slice(&q.values);
        let avx2 = crate::embed::avx2_available();
        let mut top: Vec<(u32, f32)> = Vec::with_capacity(POOL);
        let mut worst = 0f32;
        let mut worst_at = 0usize;
        let emb = &self.arena.emb;
        let n = self.arena.len();
        for i in 0..n {
            let start = i * EMB_DIM;
            let row = &emb[start..start + EMB_DIM];
            let dot = dot_i8(&qv, row, avx2);
            let norm = self.arena.norm[i];
            if norm == 0.0 || dot <= 0 {
                continue;
            }
            let score = (dot as f32) * q.scale * self.arena.scale[i] / (q.norm * norm);
            if top.len() < POOL {
                if top.is_empty() || score < worst {
                    worst = score;
                    worst_at = top.len();
                }
                top.push((i as u32, score));
            } else if score > worst {
                top[worst_at] = (i as u32, score);
                worst = f32::MAX;
                for (j, (_, s)) in top.iter().enumerate() {
                    if *s < worst {
                        worst = *s;
                        worst_at = j;
                    }
                }
            }
        }
        let mut scored: Vec<(String, f32)> = top
            .into_iter()
            .map(|(i, score)| (self.arena.item_id[i as usize].clone(), score))
            .collect();
        for turn in self.ring.turns() {
            let emb = self.embedder.embed(&turn.text);
            let score = cosine(&q, &emb.values, emb.scale, emb.norm);
            if score > 0.0 {
                scored.push((turn.id.clone(), score));
            }
        }
        scored.sort_by(|a, b| b.1.total_cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
        scored.truncate(POOL);
        scored.into_iter().map(|(id, _)| id).collect()
    }

    fn ring_lexical_ids(&self, query: &str) -> Vec<String> {
        let q_tokens = tokens(query);
        if q_tokens.is_empty() {
            return Vec::new();
        }
        let mut scored: Vec<(&str, usize)> = Vec::new();
        for turn in self.ring.turns() {
            let have = tokens(&turn.text);
            let overlap = q_tokens
                .iter()
                .filter(|t| have.iter().any(|h| h == *t))
                .count();
            if overlap > 0 {
                scored.push((turn.id.as_str(), overlap));
            }
        }
        scored.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(b.0)));
        scored
            .into_iter()
            .take(POOL)
            .map(|(id, _)| id.to_string())
            .collect()
    }

    fn hydrate(&self, item_id: &str, score: f32) -> Result<Option<Hit>> {
        if let Some(turn) = self.ring.turns().find(|t| t.id == item_id) {
            return Ok(Some(Hit {
                item_id: turn.id.clone(),
                layer: "session".to_string(),
                title: String::new(),
                text: turn.text.clone(),
                said_by: unknown_if_empty(&turn.said_by),
                date: unknown_if_empty(&turn.date),
                source: "session-ring".to_string(),
                score,
            }));
        }
        let row = self
            .conn
            .query_row(
                "SELECT layer, title, summary, body, said_by, source_date, source, marked
                 FROM items WHERE item_id = ?1",
                params![item_id],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                        row.get::<_, String>(4)?,
                        row.get::<_, String>(5)?,
                        row.get::<_, String>(6)?,
                        row.get::<_, i64>(7)?,
                    ))
                },
            )
            .optional()?;
        let Some((layer, title, summary, body, said_by, date, source, marked)) = row else {
            return Ok(None);
        };
        if marked != 0 {
            return Ok(None);
        }
        let text = if !summary.is_empty() { summary } else { body };
        Ok(Some(Hit {
            item_id: item_id.to_string(),
            layer,
            title,
            text,
            said_by: unknown_if_empty(&said_by),
            date: unknown_if_empty(&date),
            source: unknown_if_empty(&source),
            score,
        }))
    }

    fn reload_arena(&mut self) -> Result<()> {
        let mut arena = Arena::empty();
        let mut stmt = self.conn.prepare(
            "SELECT rowid, item_id, emb, emb_scale, emb_norm
             FROM items WHERE marked = 0 ORDER BY rowid",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Vec<u8>>(2)?,
                row.get::<_, f32>(3)?,
                row.get::<_, f32>(4)?,
            ))
        })?;
        for row in rows {
            let (rowid, item_id, blob, scale, norm) = row?;
            if blob.len() != EMB_DIM {
                return Err(Error::Invalid(format!(
                    "{item_id} has embedding width {}, expected {EMB_DIM}",
                    blob.len()
                )));
            }
            arena.rowid.push(rowid);
            arena.item_id.push(item_id);
            arena.scale.push(scale);
            arena.norm.push(norm);
            arena.emb.extend(blob.into_iter().map(|b| b as i8));
        }
        self.arena = arena;
        Ok(())
    }

    fn existing_rowid(&self, item_id: &str) -> Result<Option<i64>> {
        let row = self
            .conn
            .query_row(
                "SELECT rowid FROM items WHERE item_id = ?1",
                params![item_id],
                |r| r.get(0),
            )
            .optional()?;
        Ok(row)
    }

    fn rowid_of(&self, item_id: &str) -> Result<i64> {
        self.existing_rowid(item_id)?
            .ok_or_else(|| Error::NotFound(item_id.to_string()))
    }

    fn in_tx<T>(&mut self, body: impl FnOnce(&Self) -> Result<T>) -> Result<T> {
        self.conn.execute_batch("BEGIN IMMEDIATE")?;
        match body(self) {
            Ok(value) => {
                self.conn.execute_batch("COMMIT")?;
                Ok(value)
            }
            Err(err) => {
                let _ = self.conn.execute_batch("ROLLBACK");
                Err(err)
            }
        }
    }

    /// Copy a live row into `archive`, then drop it from FTS and `items`.
    /// The copy is written first, inside the caller's transaction.
    fn archive_live_row(&self, rowid: i64, reason: &str) -> Result<()> {
        let moved = self.conn.execute(
            "INSERT INTO archive (
                item_id, layer, section, category, title, body, summary, claim_type,
                said_by, source_date, source, evidence_strength, status, reason,
                emb, emb_scale, emb_norm
             )
             SELECT item_id, layer, section, category, title, body, summary, claim_type,
                said_by, source_date, source, evidence_strength, status, ?2,
                emb, emb_scale, emb_norm
             FROM items WHERE rowid = ?1",
            params![rowid, reason],
        )?;
        if moved != 1 {
            return Err(Error::NotFound(format!("row {rowid}")));
        }
        self.conn
            .execute("DELETE FROM items_fts WHERE rowid = ?1", params![rowid])?;
        self.conn
            .execute("DELETE FROM items WHERE rowid = ?1", params![rowid])?;
        Ok(())
    }

    fn next_id(&self, prefix: &str) -> Result<String> {
        self.conn
            .execute("UPDATE meta SET v = v + 1 WHERE k = 'seq'", [])?;
        let n: i64 = self
            .conn
            .query_row("SELECT v FROM meta WHERE k = 'seq'", [], |r| r.get(0))?;
        Ok(format!("{prefix}-{n}"))
    }
}

fn as_blob(emb: &Int8Vec) -> Vec<u8> {
    emb.values.iter().map(|b| *b as u8).collect()
}

fn require_fields(text: &str, said_by: &str, date: &str, source: &str) -> Result<()> {
    if text.trim().is_empty() {
        return Err(Error::Invalid("text is empty".into()));
    }
    if said_by.trim().is_empty() {
        return Err(Error::Invalid("said_by is empty".into()));
    }
    if date.trim().is_empty() {
        return Err(Error::Invalid("date is empty".into()));
    }
    if source.trim().is_empty() {
        return Err(Error::Invalid("source is empty".into()));
    }
    Ok(())
}

fn unknown_if_empty(value: &str) -> String {
    if value.trim().is_empty() {
        "unknown".to_string()
    } else {
        value.to_string()
    }
}

fn collect_json(dir: &Path, out: &mut Vec<PathBuf>) -> Result<()> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_json(&path, out)?;
        } else if path.extension().and_then(|e| e.to_str()) == Some("json") {
            out.push(path);
        }
    }
    Ok(())
}
