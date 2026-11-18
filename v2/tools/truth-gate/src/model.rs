// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use serde::Deserialize;
use serde_json::Value;

use crate::error::{GateError, Result};

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct Source {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub accessed: String,
    #[serde(default)]
    pub note: String,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct View {
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub sources: Vec<Source>,
}

/// Fields the checks read. Schema validation is separate and stricter.
#[derive(Debug, Clone, Deserialize)]
pub struct Card {
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub section: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub body: String,
    #[serde(default)]
    pub claim_type: String,
    #[serde(default)]
    pub sources: Vec<Source>,
    #[serde(default)]
    pub evidence_strength: String,
    #[serde(default)]
    pub said_by: String,
    #[serde(default)]
    pub as_of_date: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub contested_views: Vec<View>,
    #[serde(default)]
    pub related: Vec<String>,
    #[serde(default)]
    pub aliases: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CatalogCategory {
    pub id: String,
    pub section: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Catalog {
    pub categories: Vec<CatalogCategory>,
}

#[derive(Debug)]
pub struct CardFile {
    pub path: String,
    pub folder: String,
    pub value: Value,
    pub parse_error: Option<String>,
}

pub fn load_schema(path: &std::path::Path) -> Result<Value> {
    let text = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&text)?)
}

pub fn load_catalog(path: &std::path::Path) -> Result<Catalog> {
    let text = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&text)?)
}

pub fn load_cards(dir: &std::path::Path) -> Result<Vec<CardFile>> {
    if !dir.is_dir() {
        return Err(GateError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("card directory not found: {}", dir.display()),
        )));
    }
    let mut files = Vec::new();
    for section in ["world", "horbm", "diary"] {
        let section_dir = dir.join(section);
        if !section_dir.exists() {
            continue;
        }
        let mut names: Vec<_> = std::fs::read_dir(&section_dir)?
            .map(|entry| entry.map(|entry| entry.path()))
            .collect::<std::io::Result<Vec<_>>>()?;
        names.sort();
        for path in names {
            if path.is_dir() {
                return Err(GateError::Config(format!(
                    "{}: cards are files in world/, horbm/, or diary/, with no extra folders",
                    path.display()
                )));
            }
            if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
                continue;
            }
            let text = std::fs::read_to_string(&path)?;
            let relative = format!(
                "{section}/{}",
                path.file_name().unwrap_or_default().to_string_lossy()
            );
            match serde_json::from_str::<Value>(&text) {
                Ok(value) => files.push(CardFile {
                    path: relative,
                    folder: section.to_string(),
                    value,
                    parse_error: None,
                }),
                Err(err) => files.push(CardFile {
                    path: relative,
                    folder: section.to_string(),
                    value: Value::Null,
                    parse_error: Some(err.to_string()),
                }),
            }
        }
    }
    Ok(files)
}

/// Add-on packs under `v2/shards/<id>/cards/*.json`.
///
/// `shard.json` and `manifest.json` are not cards. A shard with no `cards`
/// directory is a catalog entry and is skipped. The folder name on each
/// file is `shards`, which is the card's `section`.
pub fn load_shard_cards(dir: &std::path::Path) -> Result<Vec<CardFile>> {
    if !dir.exists() {
        return Ok(Vec::new());
    }
    if !dir.is_dir() {
        return Err(GateError::Config(format!(
            "shard directory is not a directory: {}",
            dir.display()
        )));
    }
    let mut shards: Vec<_> = std::fs::read_dir(dir)?
        .map(|entry| entry.map(|entry| entry.path()))
        .collect::<std::io::Result<Vec<_>>>()?;
    shards.sort();
    let mut files = Vec::new();
    for shard in shards {
        if !shard.is_dir() {
            continue;
        }
        let cards_dir = shard.join("cards");
        if !cards_dir.is_dir() {
            continue;
        }
        let shard_id = shard
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("shard");
        let mut names: Vec<_> = std::fs::read_dir(&cards_dir)?
            .map(|entry| entry.map(|entry| entry.path()))
            .collect::<std::io::Result<Vec<_>>>()?;
        names.sort();
        for path in names {
            if path.is_dir() {
                return Err(GateError::Config(format!(
                    "{}: shard cards are files in cards/, with no extra folders",
                    path.display()
                )));
            }
            if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
                continue;
            }
            let text = std::fs::read_to_string(&path)?;
            let relative = format!(
                "shards/{shard_id}/{}",
                path.file_name().unwrap_or_default().to_string_lossy()
            );
            match serde_json::from_str::<Value>(&text) {
                Ok(value) => files.push(CardFile {
                    path: relative,
                    folder: "shards".to_string(),
                    value,
                    parse_error: None,
                }),
                Err(err) => files.push(CardFile {
                    path: relative,
                    folder: "shards".to_string(),
                    value: Value::Null,
                    parse_error: Some(err.to_string()),
                }),
            }
        }
    }
    Ok(files)
}

pub fn rank(strength: &str) -> Option<u8> {
    match strength {
        "none" => Some(0),
        "weak" => Some(1),
        "moderate" => Some(2),
        "strong" => Some(3),
        _ => None,
    }
}
