// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

//! Knowledge cards, aligned with the S1 contract for `v2/data/cards/`.
//!
//! S1 had not published `v2/data/SCHEMA.md` when this crate was written.
//! The parser accepts the fields named in that swarm's plan and a few
//! aliases from the HORBM research notes (`text`, `gist`, `speaker`,
//! `epistemic`). Unknown fields are ignored so a later schema can add keys.

use crate::error::{Error, Result};
use serde_json::Value;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Source {
    pub title: String,
    pub url: String,
    pub author: String,
    pub date: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Card {
    pub id: String,
    pub title: String,
    pub section: String,
    pub category: String,
    pub body: String,
    pub summary: String,
    pub claim_type: String,
    pub sources: Vec<Source>,
    pub evidence_strength: String,
    pub said_by: String,
    pub date: String,
    pub source: String,
    pub status: String,
    pub tags: Vec<String>,
}

impl Card {
    /// Text the index and the embedder see.
    pub fn index_text(&self) -> String {
        format!("{}\n{}\n{}", self.title, self.summary, self.body)
    }

    /// Short gist returned on a hit. The summary when it exists.
    pub fn gist(&self) -> String {
        if !self.summary.is_empty() {
            self.summary.clone()
        } else if self.body.chars().count() <= 480 {
            self.body.clone()
        } else {
            let truncated: String = self.body.chars().take(480).collect();
            format!("{truncated}…")
        }
    }
}

/// Parse one JSON value into zero or more cards.
///
/// A bare object, an array, or `{"cards":[...]}` are all accepted.
/// A JSON object that is not a card (no `id`) yields an empty list so
/// catalog files can sit beside cards. A card missing its text is an error.
pub fn parse_cards(value: &Value, path_hint: &str) -> Result<Vec<Card>> {
    match value {
        Value::Array(items) => {
            let mut out = Vec::with_capacity(items.len());
            for item in items {
                if let Some(card) = parse_one(item, path_hint)? {
                    out.push(card);
                }
            }
            Ok(out)
        }
        Value::Object(map) => {
            if let Some(cards) = map.get("cards") {
                return parse_cards(cards, path_hint);
            }
            Ok(parse_one(value, path_hint)?.into_iter().collect())
        }
        _ => Err(Error::Invalid(format!(
            "{path_hint}: card JSON must be an object or array"
        ))),
    }
}

fn parse_one(value: &Value, path_hint: &str) -> Result<Option<Card>> {
    let Some(obj) = value.as_object() else {
        return Err(Error::Invalid(format!(
            "{path_hint}: expected a card object"
        )));
    };
    let id = first_str(obj, &["id", "card_id"]);
    let Some(id) = id.filter(|s| !s.is_empty()) else {
        return Ok(None);
    };
    let title = first_str(obj, &["title"]).unwrap_or_else(|| id.clone());
    let body = first_str(obj, &["body", "text"]).unwrap_or_default();
    let summary = first_str(obj, &["summary", "gist"]).unwrap_or_default();
    if title.trim().is_empty() && body.trim().is_empty() && summary.trim().is_empty() {
        return Err(Error::Invalid(format!(
            "{path_hint}: card {id} has no text"
        )));
    }
    let section = first_str(obj, &["section", "scope"])
        .filter(|s| !s.is_empty())
        .or_else(|| section_from_path(path_hint))
        .ok_or_else(|| {
            Error::Invalid(format!(
                "{path_hint}: card {id} needs section world, horbm, or diary"
            ))
        })?;
    if !matches!(section.as_str(), "world" | "horbm" | "diary") {
        return Err(Error::Invalid(format!(
            "{path_hint}: card {id} has section '{section}', expected world, horbm, or diary"
        )));
    }
    let sources = parse_sources(obj.get("sources"));
    let said_by = first_str(obj, &["said_by", "speaker", "author"])
        .filter(|s| !s.is_empty())
        .or_else(|| sources.iter().find_map(|s| nonempty(&s.author)))
        .unwrap_or_else(|| "unknown".to_string());
    let date = first_str(obj, &["as_of_date", "date", "said_at"])
        .filter(|s| !s.is_empty())
        .or_else(|| sources.iter().find_map(|s| nonempty(&s.date)))
        .unwrap_or_else(|| "unknown".to_string());
    let source = source_label(obj, &sources);
    let claim_type = map_claim(first_str(obj, &["claim_type", "epistemic"]).unwrap_or_default());
    let tags = string_list(obj.get("tags"));
    Ok(Some(Card {
        id,
        title,
        section,
        category: first_str(obj, &["category"]).unwrap_or_default(),
        body,
        summary,
        claim_type,
        evidence_strength: first_str(obj, &["evidence_strength"]).unwrap_or_default(),
        said_by,
        date,
        source,
        status: first_str(obj, &["status"]).unwrap_or_default(),
        tags,
        sources,
    }))
}

fn source_label(obj: &serde_json::Map<String, Value>, sources: &[Source]) -> String {
    if let Some(src) = sources.first() {
        let label = match (src.title.is_empty(), src.url.is_empty()) {
            (false, false) => format!("{} {}", src.title, src.url),
            (false, true) => src.title.clone(),
            (true, false) => src.url.clone(),
            (true, true) => String::new(),
        };
        if !label.is_empty() {
            return label;
        }
    }
    if let Some(Value::String(s)) = obj.get("source").or_else(|| obj.get("src")) {
        if !s.trim().is_empty() {
            return s.trim().to_string();
        }
    }
    "unknown".to_string()
}

fn parse_sources(value: Option<&Value>) -> Vec<Source> {
    let Some(Value::Array(items)) = value else {
        return Vec::new();
    };
    items
        .iter()
        .filter_map(|item| {
            let obj = item.as_object()?;
            Some(Source {
                title: first_str(obj, &["title"]).unwrap_or_default(),
                url: first_str(obj, &["url", "href"]).unwrap_or_default(),
                author: first_str(obj, &["author"]).unwrap_or_default(),
                date: first_str(obj, &["date", "accessed"]).unwrap_or_default(),
            })
        })
        .collect()
}

fn string_list(value: Option<&Value>) -> Vec<String> {
    match value {
        Some(Value::Array(items)) => items
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect(),
        _ => Vec::new(),
    }
}

fn map_claim(raw: String) -> String {
    match raw.as_str() {
        "said" => "fact".to_string(),
        "inferred" => "interpretation".to_string(),
        "opinion" => "opinion".to_string(),
        other => other.to_string(),
    }
}

fn section_from_path(path: &str) -> Option<String> {
    for part in path.split(['/', '\\']) {
        if matches!(part, "world" | "horbm" | "diary") {
            return Some(part.to_string());
        }
    }
    None
}

fn first_str(obj: &serde_json::Map<String, Value>, keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Some(Value::String(s)) = obj.get(*key) {
            return Some(s.trim().to_string());
        }
    }
    None
}

fn nonempty(s: &str) -> Option<String> {
    if s.is_empty() {
        None
    } else {
        Some(s.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_s1_shape_and_fills_unknowns() {
        let raw = r#"{
            "id": "stivers-2009",
            "title": "Turn-taking gap",
            "section": "world",
            "category": "science",
            "summary": "Mean answer offset is about 208 ms.",
            "body": "Across ten languages the mean offset is +208 ms.",
            "claim_type": "fact",
            "sources": [{"title": "Stivers et al., PNAS 2009", "url": "https://doi.org/10.1073/pnas.0903616106", "author": "Tanya Stivers and colleagues", "date": "2009"}],
            "evidence_strength": "strong",
            "said_by": "",
            "as_of_date": "",
            "status": "draft",
            "contested_views": [],
            "related": [],
            "extra_future_field": true
        }"#;
        let value: Value = serde_json::from_str(raw).unwrap();
        let cards = parse_cards(&value, "v2/data/cards/world/stivers-2009.json").unwrap();
        assert_eq!(cards.len(), 1);
        assert_eq!(cards[0].said_by, "Tanya Stivers and colleagues");
        assert_eq!(cards[0].date, "2009");
        assert!(cards[0].source.contains("pnas.0903616106"));
    }

    #[test]
    fn skips_a_catalog_object() {
        let value: Value = serde_json::from_str(r#"{"sections":["world"]}"#).unwrap();
        let cards = parse_cards(&value, "v2/data/catalog.json").unwrap();
        assert!(cards.is_empty());
    }
}
