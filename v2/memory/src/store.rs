// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

use crate::card::{parse_cards, provenance_from_document, Card, ContestedView, Source};
use crate::embed::{cosine, dot_i8, HashingEmbedder, Int8Vec, EMB_DIM};
use crate::error::{Error, Result};
use crate::rrf::fuse;
use crate::session::{SessionRing, Turn};
use crate::text::{index_tokens, is_stopword, tokens};

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
    emb_norm REAL NOT NULL,
    document TEXT NOT NULL DEFAULT '',
    content_hash TEXT NOT NULL DEFAULT ''
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
    tokenize = 'unicode61'
);
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts_vocab USING fts5vocab(items_fts, 'row');
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
    emb_norm REAL NOT NULL,
    document TEXT NOT NULL DEFAULT '',
    content_hash TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS card_revisions (
    revision_id INTEGER PRIMARY KEY,
    item_id TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    document TEXT NOT NULL,
    claim_type TEXT NOT NULL DEFAULT '',
    evidence_strength TEXT NOT NULL DEFAULT '',
    said_by TEXT NOT NULL DEFAULT '',
    source_date TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    archived_at TEXT NOT NULL,
    reason TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS card_revisions_once
    ON card_revisions(item_id, content_hash, reason);
CREATE TABLE IF NOT EXISTS gaps (
    id INTEGER PRIMARY KEY,
    query TEXT NOT NULL,
    asked_at TEXT NOT NULL,
    reason TEXT NOT NULL,
    nearest TEXT NOT NULL,
    advice TEXT NOT NULL,
    detail TEXT NOT NULL
);
"#;

const SCHEMA_VERSION: i32 = 4;
/// Skip a term that hits more than 2% of a diary once the diary is large
/// enough for that fraction to be a real scan. BM25 of a near-universal
/// term does not separate rows.
const DF_FRACTION_DEN: i64 = 50;
const DF_PLAN_MIN_ROWS: i64 = 64;
const MAX_LEXICAL_TERMS: usize = 8;

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct Hit {
    pub item_id: String,
    pub layer: String,
    /// `memory` is what the user told us (ring, episode, diary).
    /// `knowledge` is a card in the core pack or a shard.
    /// The two are never fused into one score.
    pub pool: String,
    pub title: String,
    pub text: String,
    pub said_by: String,
    pub date: String,
    pub source: String,
    pub claim_type: String,
    pub evidence: String,
    pub sources: Vec<Source>,
    pub contested_views: Vec<ContestedView>,
    pub score: f32,
    /// Title, gist, body, speaker, source, and contested views. Used to
    /// decide whether a hit actually covers the query. Not part of the JSON.
    #[serde(skip)]
    pub haystack: String,
}

impl Hit {
    pub(crate) fn make(
        item_id: impl Into<String>,
        layer: &str,
        title: impl Into<String>,
        text: impl Into<String>,
        body: impl Into<String>,
        said_by: impl Into<String>,
        date: impl Into<String>,
        source: impl Into<String>,
        claim_type: impl Into<String>,
        evidence: impl Into<String>,
        sources: Vec<Source>,
        contested_views: Vec<ContestedView>,
        score: f32,
    ) -> Self {
        let title = title.into();
        let text = text.into();
        let body = body.into();
        let said_by_raw = said_by.into();
        let date_raw = date.into();
        let source_raw = source.into();
        let mut haystack = String::new();
        for part in [
            title.as_str(),
            text.as_str(),
            body.as_str(),
            said_by_raw.as_str(),
            source_raw.as_str(),
        ] {
            haystack.push_str(part);
            haystack.push(' ');
        }
        for view in &contested_views {
            haystack.push_str(&view.label);
            haystack.push(' ');
            haystack.push_str(&view.summary);
            haystack.push(' ');
        }
        Self {
            item_id: item_id.into(),
            layer: layer.to_string(),
            pool: pool_of(layer).to_string(),
            title,
            text,
            said_by: unknown_if_empty(&said_by_raw),
            date: unknown_if_empty(&date_raw),
            source: unknown_if_empty(&source_raw),
            claim_type: claim_type.into(),
            evidence: evidence.into(),
            sources,
            contested_views,
            score,
            haystack,
        }
    }
}

/// `memory` is a turn, an episode, or a diary line. Everything else is a card.
pub fn pool_of(layer: &str) -> &'static str {
    match layer {
        "session" | "episode" | "diary" => "memory",
        _ => "knowledge",
    }
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
    pub revised: usize,
    pub unchanged: usize,
    pub skipped: Vec<String>,
}

/// One archived card version. Append-only. Search does not read this.
#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct CardRevision {
    pub item_id: String,
    pub content_hash: String,
    pub document: String,
    pub archived_at: String,
    pub reason: String,
}

/// The same query, counted. The latest advice is the one to act on.
#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct GapRank {
    pub query: String,
    pub times: i64,
    pub latest: String,
    pub advice: String,
    pub detail: String,
    pub nearest: String,
}

struct Arena {
    rowid: Vec<i64>,
    item_id: Vec<String>,
    scale: Vec<f32>,
    norm: Vec<f32>,
    /// True for episode and diary rows. Semantic cards are knowledge.
    memory: Vec<bool>,
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
            memory: Vec::new(),
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
        if version == 0 {
            conn.execute_batch(SCHEMA)?;
            conn.pragma_update(None, "user_version", SCHEMA_VERSION)?;
        } else if version < SCHEMA_VERSION {
            conn.execute_batch(SCHEMA)?;
            ensure_column(&conn, "items", "document", "TEXT NOT NULL DEFAULT ''")?;
            ensure_column(&conn, "items", "content_hash", "TEXT NOT NULL DEFAULT ''")?;
            ensure_column(&conn, "archive", "document", "TEXT NOT NULL DEFAULT ''")?;
            ensure_column(&conn, "archive", "content_hash", "TEXT NOT NULL DEFAULT ''")?;
            rebuild_fts(&conn)?;
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
                revised: 0,
                unchanged: 0,
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
                    match store.upsert_card_tx(&card)? {
                        UpsertKind::Inserted | UpsertKind::Restored => {}
                        UpsertKind::Revised => report.revised += 1,
                        UpsertKind::Unchanged => report.unchanged += 1,
                    }
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
            let document = memory_document(text, said_by, date, source);
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
                &document,
                "",
                text,
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
            let document = memory_document(text, said_by, date, source);
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
                &document,
                "",
                text,
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
        self.search_filtered(query, false)
    }

    /// Ring, episodes, and diary only. Knowledge cards in this file are left out
    /// so a caller can rank them on their own.
    pub fn search_memory(&self, query: &str) -> Result<SearchResponse> {
        self.search_filtered(query, true)
    }

    fn search_filtered(&self, query: &str, memory_only: bool) -> Result<SearchResponse> {
        let started = Instant::now();
        let lexical = self.lexical_ids(query, memory_only)?;
        let dense = self.dense_ids(query, memory_only);
        let ring_lex = self.ring_lexical_ids(query);
        // The lexical list is counted twice so a rare exact term beats a tied vector neighbor.
        let fused = fuse(&[lexical.clone(), lexical, dense, ring_lex], RRF_K);
        let mut hits = Vec::with_capacity(MAX_HITS);
        for (id, score) in fused.into_iter().take(POOL) {
            if let Some(hit) = self.hydrate(&id, score)? {
                if memory_only && hit.pool != "memory" {
                    continue;
                }
                hits.push(hit);
                if hits.len() == MAX_HITS {
                    break;
                }
            }
        }
        let took_us = u32::try_from(started.elapsed().as_micros()).unwrap_or(u32::MAX);
        Ok(SearchResponse {
            query: query.to_string(),
            hits,
            took_us,
        })
    }

    /// Append one gap. Rows are never deleted.
    pub fn log_gap(
        &self,
        query: &str,
        reason: &str,
        nearest_json: &str,
        advice: &str,
        detail: &str,
    ) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO gaps (query, asked_at, reason, nearest, advice, detail)
             VALUES (?1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?2, ?3, ?4, ?5)",
            params![query, reason, nearest_json, advice, detail],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    /// Queries we could not answer, most often first.
    pub fn gap_queue(&self) -> Result<Vec<GapRank>> {
        let mut stmt = self.conn.prepare(
            "SELECT g.query, c.n, g.asked_at, g.advice, g.detail, g.nearest
             FROM gaps g
             JOIN (
                SELECT lower(trim(query)) AS q, COUNT(*) AS n, MAX(id) AS max_id
                FROM gaps
                GROUP BY q
             ) c ON g.id = c.max_id
             ORDER BY c.n DESC, g.asked_at DESC, g.id DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(GapRank {
                query: row.get(0)?,
                times: row.get(1)?,
                latest: row.get(2)?,
                advice: row.get(3)?,
                detail: row.get(4)?,
                nearest: row.get(5)?,
            })
        })?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    /// Older card versions, oldest first. The live row is not in this list.
    pub fn revisions_for(&self, item_id: &str) -> Result<Vec<CardRevision>> {
        let mut stmt = self.conn.prepare(
            "SELECT item_id, content_hash, document, archived_at, reason
             FROM card_revisions WHERE item_id = ?1 ORDER BY revision_id ASC",
        )?;
        let rows = stmt.query_map(params![item_id], |row| {
            Ok(CardRevision {
                item_id: row.get(0)?,
                content_hash: row.get(1)?,
                document: row.get(2)?,
                archived_at: row.get(3)?,
                reason: row.get(4)?,
            })
        })?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    pub fn revision_count(&self) -> Result<usize> {
        let n: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM card_revisions", [], |r| r.get(0))?;
        Ok(n as usize)
    }

    pub fn document_of(&self, item_id: &str) -> Result<Option<String>> {
        let row = self
            .conn
            .query_row(
                "SELECT document FROM items WHERE item_id = ?1 AND marked = 0",
                params![item_id],
                |r| r.get::<_, String>(0),
            )
            .optional()?;
        Ok(row.filter(|doc| !doc.is_empty()))
    }

    pub fn documents(&self) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare(
            "SELECT document FROM items WHERE marked = 0 AND document != '' ORDER BY rowid",
        )?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    pub fn active_count(&self) -> Result<usize> {
        let n: i64 =
            self.conn
                .query_row("SELECT COUNT(*) FROM items WHERE marked = 0", [], |r| {
                    r.get(0)
                })?;
        Ok(n as usize)
    }

    fn upsert_card_tx(&self, card: &Card) -> Result<UpsertKind> {
        let emb = self.embedder.embed(&card.index_text());
        if let Some((rowid, hash, marked)) = self.existing_card(&card.id)? {
            if hash == card.content_hash {
                if marked == 0 {
                    return Ok(UpsertKind::Unchanged);
                }
                self.conn.execute(
                    "UPDATE items SET marked = 0 WHERE rowid = ?1",
                    params![rowid],
                )?;
                self.insert_fts(
                    rowid,
                    &card.title,
                    &card.summary,
                    &card.lexical_body(),
                    &card.said_by,
                    &card.source,
                )?;
                return Ok(UpsertKind::Restored);
            }
            self.archive_revision(rowid, "replaced")?;
            self.conn
                .execute("DELETE FROM items_fts WHERE rowid = ?1", params![rowid])?;
            self.conn.execute(
                "UPDATE items SET
                    layer = 'semantic', section = ?1, category = ?2, title = ?3,
                    body = ?4, summary = ?5, claim_type = ?6, said_by = ?7,
                    source_date = ?8, source = ?9, evidence_strength = ?10,
                    status = ?11, marked = 0, emb = ?12, emb_scale = ?13, emb_norm = ?14,
                    document = ?15, content_hash = ?16
                 WHERE rowid = ?17",
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
                    card.document,
                    card.content_hash,
                    rowid,
                ],
            )?;
            self.insert_fts(
                rowid,
                &card.title,
                &card.summary,
                &card.lexical_body(),
                &card.said_by,
                &card.source,
            )?;
            return Ok(UpsertKind::Revised);
        }
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
            &card.document,
            &card.content_hash,
            &card.lexical_body(),
            &emb,
        )?;
        Ok(UpsertKind::Inserted)
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
        document: &str,
        content_hash: &str,
        fts_body: &str,
        emb: &Int8Vec,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO items (
                item_id, layer, section, category, title, body, summary, claim_type,
                said_by, source_date, source, evidence_strength, status, marked,
                emb, emb_scale, emb_norm, document, content_hash
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 0, ?14, ?15, ?16, ?17, ?18)",
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
                document,
                content_hash,
            ],
        )?;
        let rowid = self.conn.last_insert_rowid();
        self.insert_fts(rowid, title, summary, fts_body, said_by, source)?;
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
            params![
                rowid,
                fts_field(title),
                fts_field(summary),
                fts_field(body),
                fts_field(said_by),
                fts_field(source),
            ],
        )?;
        Ok(())
    }

    fn lexical_ids(&self, query: &str, memory_only: bool) -> Result<Vec<String>> {
        let Some(match_q) = self.planned_match(query)? else {
            return Ok(Vec::new());
        };
        let layer_sql = if memory_only {
            "AND items.layer IN ('episode', 'diary')"
        } else {
            ""
        };
        let sql = format!(
            "SELECT items.item_id
             FROM items_fts
             JOIN items ON items.rowid = items_fts.rowid
             WHERE items_fts MATCH ?1 AND items.marked = 0 {layer_sql}
             ORDER BY rank
             LIMIT ?2"
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(params![match_q, POOL as i64], |row| row.get::<_, String>(0))?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    /// Keep the rare terms. A term in more than 1/50 of a large diary is
    /// dropped: its IDF is too small to be worth a full postings scan.
    fn planned_match(&self, query: &str) -> Result<Option<String>> {
        match_query(&self.conn, self.arena.len() as i64, query)
    }

    fn dense_ids(&self, query: &str, memory_only: bool) -> Vec<String> {
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
            if memory_only && !self.arena.memory[i] {
                continue;
            }
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
            return Ok(Some(Hit::make(
                turn.id.clone(),
                "session",
                "",
                turn.text.clone(),
                turn.text.clone(),
                turn.said_by.clone(),
                turn.date.clone(),
                "session-ring",
                "user-said",
                "",
                Vec::new(),
                Vec::new(),
                score,
            )));
        }
        let row = self
            .conn
            .query_row(
                "SELECT layer, title, summary, body, said_by, source_date, source,
                        claim_type, evidence_strength, document, marked
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
                        row.get::<_, String>(7)?,
                        row.get::<_, String>(8)?,
                        row.get::<_, String>(9)?,
                        row.get::<_, i64>(10)?,
                    ))
                },
            )
            .optional()?;
        let Some((
            layer,
            title,
            summary,
            body,
            said_by,
            date,
            source,
            claim_type,
            evidence,
            document,
            marked,
        )) = row
        else {
            return Ok(None);
        };
        if marked != 0 {
            return Ok(None);
        }
        let text = if !summary.is_empty() {
            summary
        } else {
            body.clone()
        };
        let (sources, views) = if layer == LAYER_SEMANTIC {
            provenance_from_document(&document)
        } else {
            (Vec::new(), Vec::new())
        };
        Ok(Some(Hit::make(
            item_id, &layer, title, text, body, said_by, date, source, claim_type, evidence,
            sources, views, score,
        )))
    }

    fn reload_arena(&mut self) -> Result<()> {
        let mut arena = Arena::empty();
        let mut stmt = self.conn.prepare(
            "SELECT rowid, item_id, layer, emb, emb_scale, emb_norm
             FROM items WHERE marked = 0 ORDER BY rowid",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Vec<u8>>(3)?,
                row.get::<_, f32>(4)?,
                row.get::<_, f32>(5)?,
            ))
        })?;
        for row in rows {
            let (rowid, item_id, layer, blob, scale, norm) = row?;
            if blob.len() != EMB_DIM {
                return Err(Error::Invalid(format!(
                    "{item_id} has embedding width {}, expected {EMB_DIM}",
                    blob.len()
                )));
            }
            arena.rowid.push(rowid);
            arena.item_id.push(item_id);
            arena
                .memory
                .push(layer == LAYER_EPISODE || layer == LAYER_DIARY);
            arena.scale.push(scale);
            arena.norm.push(norm);
            arena.emb.extend(blob.into_iter().map(|b| b as i8));
        }
        self.arena = arena;
        Ok(())
    }

    fn existing_card(&self, item_id: &str) -> Result<Option<(i64, String, i64)>> {
        let row = self
            .conn
            .query_row(
                "SELECT rowid, content_hash, marked FROM items WHERE item_id = ?1",
                params![item_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .optional()?;
        Ok(row)
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

    /// Copy the live card into `card_revisions` before it is replaced.
    /// The revision row is not removed by anything in this crate.
    fn archive_revision(&self, rowid: i64, reason: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR IGNORE INTO card_revisions (
                item_id, content_hash, document, claim_type, evidence_strength,
                said_by, source_date, source, archived_at, reason
             )
             SELECT item_id, content_hash, document, claim_type, evidence_strength,
                said_by, source_date, source, strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?2
             FROM items WHERE rowid = ?1 AND content_hash != ''",
            params![rowid, reason],
        )?;
        Ok(())
    }

    /// Copy a live row into `archive`, then drop it from FTS and `items`.
    /// The copy is written first, inside the caller's transaction.
    fn archive_live_row(&self, rowid: i64, reason: &str) -> Result<()> {
        let moved = self.conn.execute(
            "INSERT INTO archive (
                item_id, layer, section, category, title, body, summary, claim_type,
                said_by, source_date, source, evidence_strength, status, reason,
                emb, emb_scale, emb_norm, document, content_hash
             )
             SELECT item_id, layer, section, category, title, body, summary, claim_type,
                said_by, source_date, source, evidence_strength, status, ?2,
                emb, emb_scale, emb_norm, document, content_hash
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

enum UpsertKind {
    Inserted,
    Revised,
    Unchanged,
    Restored,
}

fn memory_document(text: &str, said_by: &str, date: &str, source: &str) -> String {
    serde_json::json!({
        "kind": "memory",
        "text": text,
        "said_by": said_by,
        "date": date,
        "source": source,
    })
    .to_string()
}

fn ensure_column(conn: &Connection, table: &str, column: &str, decl: &str) -> Result<()> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let names = stmt.query_map([], |row| row.get::<_, String>(1))?;
    for name in names {
        if name? == column {
            return Ok(());
        }
    }
    drop(stmt);
    conn.execute_batch(&format!("ALTER TABLE {table} ADD COLUMN {column} {decl}"))?;
    Ok(())
}

fn fts_field(raw: &str) -> String {
    index_tokens(raw).join(" ")
}

/// Keep the rare terms. A term in more than 1/50 of a large diary is
/// dropped: its IDF is too small to be worth a full postings scan.
pub(crate) fn match_query(conn: &Connection, n_docs: i64, query: &str) -> Result<Option<String>> {
    let mut terms: Vec<String> = index_tokens(query);
    terms.sort();
    terms.dedup();
    if terms.is_empty() {
        return Ok(None);
    }
    let cap = df_cap(n_docs);
    let mut ranked: Vec<(i64, String)> = Vec::new();
    for term in terms {
        if is_stopword(&term) {
            continue;
        }
        let df = doc_freq_on(conn, &term)?;
        if df == 0 || (cap > 0 && df > cap) {
            continue;
        }
        ranked.push((df, term));
    }
    ranked.sort_by(|a, b| a.0.cmp(&b.0).then_with(|| a.1.cmp(&b.1)));
    let mut kept = Vec::new();
    let mut budget = if cap == 0 { i64::MAX } else { cap };
    for (df, term) in ranked {
        if !kept.is_empty() && df > budget {
            break;
        }
        budget = budget.saturating_sub(df);
        kept.push(term);
        if kept.len() == MAX_LEXICAL_TERMS {
            break;
        }
    }
    if kept.is_empty() {
        return Ok(None);
    }
    Ok(Some(
        kept.into_iter()
            .map(|t| format!("\"{t}\""))
            .collect::<Vec<_>>()
            .join(" OR "),
    ))
}

pub(crate) fn doc_freq_on(conn: &Connection, term: &str) -> Result<i64> {
    let df = conn
        .query_row(
            "SELECT doc FROM items_fts_vocab WHERE term = ?1",
            params![term],
            |row| row.get(0),
        )
        .optional()?;
    Ok(df.unwrap_or(0))
}

/// `0` means "do not drop terms for frequency" (a tiny diary).
pub(crate) fn df_cap(n: i64) -> i64 {
    if n < DF_PLAN_MIN_ROWS {
        0
    } else {
        (n / DF_FRACTION_DEN).max(64)
    }
}

fn rebuild_fts(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "DROP TABLE IF EXISTS items_fts_vocab;
         DROP TABLE IF EXISTS items_fts;
         CREATE VIRTUAL TABLE items_fts USING fts5(
            title, summary, body, said_by, source,
            tokenize = 'unicode61'
         );
         CREATE VIRTUAL TABLE items_fts_vocab USING fts5vocab(items_fts, 'row');",
    )?;
    let mut stmt = conn.prepare(
        "SELECT rowid, title, summary, body, said_by, source
         FROM items WHERE marked = 0",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, String>(5)?,
        ))
    })?;
    let mut pending = Vec::new();
    for row in rows {
        pending.push(row?);
    }
    drop(stmt);
    for (rowid, title, summary, body, said_by, source) in pending {
        conn.execute(
            "INSERT INTO items_fts(rowid, title, summary, body, said_by, source)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                rowid,
                fts_field(&title),
                fts_field(&summary),
                fts_field(&body),
                fts_field(&said_by),
                fts_field(&source),
            ],
        )?;
    }
    Ok(())
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
