// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

//! The truth gate for Galion Knowledge cards.
//!
//! A card is published only when this gate reports no hard failure.
//! Warnings stay in the report. The gate does not invent a source, raise an
//! evidence label, or delete a card.

mod check;
mod classify;
mod config;
mod error;
mod live;
mod model;
mod report;
mod textutil;

use std::path::PathBuf;
use std::time::Duration;

pub use check::{evaluate, Input};
pub use config::{load_config, prepare, Config, DomainRule};
pub use error::{GateError, Result};
pub use live::finding_for_status as live_status;
pub use model::{load_cards, load_catalog, load_schema, load_shard_cards, CardFile, Catalog};
pub use report::{Finding, Report, Severity};

pub struct Options {
    pub cards_dir: PathBuf,
    /// `v2/shards`. `None` checks only `cards_dir`.
    pub shards_dir: Option<PathBuf>,
    pub schema_path: PathBuf,
    pub config_path: PathBuf,
    pub catalog_path: Option<PathBuf>,
    pub check_urls: bool,
    pub timeout: Duration,
}

pub fn run(options: &Options) -> Result<Report> {
    let schema = load_schema(&options.schema_path)?;
    let config = load_config(&options.config_path)?;
    let catalog = match &options.catalog_path {
        Some(path) => Some(load_catalog(path)?),
        None => None,
    };
    let mut files = load_cards(&options.cards_dir)?;
    if let Some(dir) = &options.shards_dir {
        files.extend(load_shard_cards(dir)?);
    }
    evaluate(&Input {
        files: &files,
        schema: &schema,
        config: &config,
        catalog: catalog.as_ref(),
        check_urls: options.check_urls,
        timeout: options.timeout,
    })
}
