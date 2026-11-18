// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::collections::BTreeMap;
use std::path::Path;

use serde::Deserialize;

use crate::error::{GateError, Result};
use crate::model::rank;

#[derive(Debug, Clone, Deserialize)]
pub struct DomainRule {
    pub suffix: String,
    pub class: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub banned_suffixes: Vec<String>,
    #[serde(default)]
    pub banned_host_substrings: Vec<String>,
    #[serde(default)]
    pub mention_phrases: Vec<String>,
    #[serde(default)]
    pub placeholder_suffixes: Vec<String>,
    #[serde(default)]
    pub resolver_domains: Vec<String>,
    #[serde(default)]
    pub official_suffixes: Vec<String>,
    pub ceilings: BTreeMap<String, String>,
    pub near_duplicate_jaccard: f64,
    pub title_jaccard: f64,
    pub body_jaccard_with_title: f64,
    pub outlet_share: f64,
    pub outlet_min_urls: usize,
    pub voice_share: f64,
    pub voice_min_urls: usize,
    pub recommended_statuses: Vec<String>,
    pub loaded_phrases: Vec<String>,
    #[serde(rename = "domain")]
    pub domains: Vec<DomainRule>,
}

impl Config {
    pub fn ceiling_of(&self, class: &str) -> &str {
        self.ceilings
            .get(class)
            .map(String::as_str)
            .unwrap_or("weak")
    }
}

pub fn load_config(path: &Path) -> Result<Config> {
    let text = std::fs::read_to_string(path)?;
    let config: Config = toml::from_str(&text)?;
    prepare(config)
}

pub fn prepare(mut config: Config) -> Result<Config> {
    let lower = |items: &mut Vec<String>| {
        for item in items.iter_mut() {
            *item = item.trim().to_ascii_lowercase();
        }
    };
    lower(&mut config.banned_suffixes);
    lower(&mut config.banned_host_substrings);
    lower(&mut config.mention_phrases);
    lower(&mut config.placeholder_suffixes);
    lower(&mut config.resolver_domains);
    lower(&mut config.official_suffixes);
    lower(&mut config.loaded_phrases);
    for rule in &mut config.domains {
        rule.suffix = rule
            .suffix
            .trim()
            .trim_start_matches('.')
            .to_ascii_lowercase();
        rule.class = rule.class.trim().to_string();
        if !config.ceilings.contains_key(&rule.class) {
            return Err(GateError::Config(format!(
                "domain '{}' uses class '{}', which has no ceiling",
                rule.suffix, rule.class
            )));
        }
    }
    for (class, ceiling) in &config.ceilings {
        if rank(ceiling).is_none() {
            return Err(GateError::Config(format!(
                "ceiling for {class} is '{ceiling}', not none, weak, moderate, or strong"
            )));
        }
    }
    for (name, value) in [
        ("near_duplicate_jaccard", config.near_duplicate_jaccard),
        ("title_jaccard", config.title_jaccard),
        ("body_jaccard_with_title", config.body_jaccard_with_title),
        ("outlet_share", config.outlet_share),
        ("voice_share", config.voice_share),
    ] {
        if !(0.0..=1.0).contains(&value) {
            return Err(GateError::Config(format!("{name} must be between 0 and 1")));
        }
    }
    if config.recommended_statuses.is_empty() {
        return Err(GateError::Config(
            "recommended_statuses is empty".to_string(),
        ));
    }
    config
        .domains
        .sort_by_key(|rule| std::cmp::Reverse(rule.suffix.len()));
    config
        .official_suffixes
        .sort_by_key(|suffix| std::cmp::Reverse(suffix.len()));
    Ok(config)
}
