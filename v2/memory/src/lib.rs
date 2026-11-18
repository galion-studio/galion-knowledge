// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

//! HORBM's diary and memory stack for knowledge.galion.app.
//!
//! Three places a sentence can live:
//!
//! - a short-term RAM ring ([`SessionRing`]), gone when the process exits
//! - an episode row, written only by [`Store::remember`]
//! - a sourced semantic row, written by ingesting a knowledge card, plus
//!   the append-only diary
//! - an archive of stored rows that an admin `forget` hid from retrieval.
//!   The text stays in the archive. Search does not read it.
//!
//! Consent is given by use. There is no withdrawal command.
//!
//! Search mixes SQLite FTS5 BM25 with an exact scan of one int8 vector per
//! row, fuses the two rankings with reciprocal rank fusion, and returns at
//! most [`MAX_HITS`] hits. Every hit carries `said_by`, `date`, and `source`.

mod card;
mod embed;
mod error;
mod rrf;
mod scale;
mod session;
mod store;
mod text;

pub use card::{parse_cards, Card, Source};
pub use embed::{simd_lane, HashingEmbedder, EMB_DIM};
pub use error::{Error, Result};
pub use scale::{rss_bytes, ScaleIndex, ScaleReport, ShardManifest, CATEGORIES};
pub use session::{SessionRing, Turn};
pub use store::{
    ArchivedRow, DiaryEntry, Hit, IngestReport, SearchResponse, Store, LAYER_DIARY, LAYER_EPISODE,
    LAYER_SEMANTIC, MAX_HITS, RRF_K,
};
