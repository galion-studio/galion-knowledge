// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

//! HORBM's diary and memory stack for knowledge.galion.app.
//!
//! Three places a sentence can live:
//!
//! - a short-term RAM ring ([`SessionRing`]), gone when the process exits
//!   or when consent is withdrawn
//! - an episode row, written only by [`Store::remember`]
//! - a sourced semantic row, written by ingesting a knowledge card, plus
//!   the append-only diary
//!
//! Search mixes SQLite FTS5 BM25 with an exact scan of one int8 vector per
//! row, fuses the two rankings with reciprocal rank fusion, and returns at
//! most [`MAX_HITS`] hits. Every hit carries `said_by`, `date`, and `source`.

mod card;
mod embed;
mod error;
mod rrf;
mod session;
mod store;
mod text;

pub use card::{parse_cards, Card, Source};
pub use embed::{simd_lane, HashingEmbedder, EMB_DIM};
pub use error::{Error, Result};
pub use session::{SessionRing, Turn};
pub use store::{
    DiaryEntry, Hit, IngestReport, SearchResponse, Store, LAYER_DIARY, LAYER_EPISODE,
    LAYER_SEMANTIC, MAX_HITS, RRF_K,
};
