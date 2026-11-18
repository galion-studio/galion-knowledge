// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use serde::Serialize;
use serde_json::Value;

use crate::error::Result;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Hard,
    Warn,
    Info,
}

#[derive(Clone, Debug, Serialize)]
pub struct Finding {
    pub severity: Severity,
    pub code: String,
    pub card_id: String,
    pub path: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<Value>,
}

#[derive(Debug)]
pub struct Report {
    pub generated_on: String,
    pub card_count: usize,
    pub findings: Vec<Finding>,
}

impl Report {
    pub fn count(&self, severity: Severity) -> usize {
        self.findings
            .iter()
            .filter(|finding| finding.severity == severity)
            .count()
    }

    pub fn hard_count(&self) -> usize {
        self.count(Severity::Hard)
    }

    pub fn by_code(&self) -> BTreeMap<&str, usize> {
        let mut counts = BTreeMap::new();
        for finding in &self.findings {
            *counts.entry(finding.code.as_str()).or_default() += 1;
        }
        counts
    }

    pub fn codes<'a>(&'a self, code: &str) -> Vec<&'a Finding> {
        self.findings
            .iter()
            .filter(|finding| finding.code == code)
            .collect()
    }

    /// 0 when there is no hard failure. 1 when a card must not be published as it stands.
    pub fn exit_code(&self) -> i32 {
        if self.hard_count() == 0 {
            0
        } else {
            1
        }
    }

    pub fn summary(&self) -> String {
        format!(
            "truth-gate: {} cards, {} hard, {} warnings, {} notes",
            self.card_count,
            self.hard_count(),
            self.count(Severity::Warn),
            self.count(Severity::Info)
        )
    }

    pub fn write_json(&self, path: &Path) -> Result<()> {
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent)?;
            }
        }
        let file = fs::File::create(path)?;
        let body = JsonReport {
            gate: "truth-gate",
            version: env!("CARGO_PKG_VERSION"),
            generated_on: &self.generated_on,
            cards: self.card_count,
            hard_failures: self.hard_count(),
            warnings: self.count(Severity::Warn),
            info: self.count(Severity::Info),
            by_code: self
                .by_code()
                .into_iter()
                .map(|(code, count)| (code.to_string(), count))
                .collect(),
            findings: &self.findings,
        };
        serde_json::to_writer_pretty(file, &body)?;
        Ok(())
    }

    pub fn write_markdown(&self, path: &Path) -> Result<()> {
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent)?;
            }
        }
        fs::write(path, self.to_markdown())?;
        Ok(())
    }

    pub fn to_markdown(&self) -> String {
        let mut out = String::new();
        out.push_str("# Truth gate report\n\n");
        out.push_str(&format!(
            "Generated on {}. {} cards. {} hard failures. {} warnings. {} notes.\n\n",
            self.generated_on,
            self.card_count,
            self.hard_count(),
            self.count(Severity::Warn),
            self.count(Severity::Info)
        ));
        out.push_str("Hard failures block publication. Warnings and notes stay visible. They do not hide a disagreement and they do not rewrite a card.\n\n");
        out.push_str("## Counts\n\n");
        out.push_str("| Code | Severity | Count |\n| --- | --- | ---: |\n");
        let mut rows: Vec<_> = self.by_code().into_iter().collect();
        rows.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(b.0)));
        if rows.is_empty() {
            out.push_str("| — | — | 0 |\n");
        }
        for (code, count) in rows {
            let severity = self
                .findings
                .iter()
                .find(|finding| finding.code == code)
                .map(|finding| match finding.severity {
                    Severity::Hard => "hard",
                    Severity::Warn => "warn",
                    Severity::Info => "info",
                })
                .unwrap_or("");
            out.push_str(&format!("| `{code}` | {severity} | {count} |\n"));
        }
        for (title, severity) in [
            ("Hard failures", Severity::Hard),
            ("Warnings", Severity::Warn),
            ("Notes", Severity::Info),
        ] {
            out.push_str(&format!("\n## {title}\n\n"));
            let group: Vec<_> = self
                .findings
                .iter()
                .filter(|finding| finding.severity == severity)
                .collect();
            if group.is_empty() {
                out.push_str("None.\n");
                continue;
            }
            let mut current = "";
            for finding in group {
                if finding.code != current {
                    current = &finding.code;
                    out.push_str(&format!("\n### `{}`\n\n", finding.code));
                }
                let who = if finding.card_id.is_empty() {
                    finding.path.clone()
                } else {
                    format!("{} ({})", finding.card_id, finding.path)
                };
                out.push_str(&format!("- {who}: {}\n", finding.message));
            }
        }
        out.push('\n');
        out
    }
}

#[derive(Serialize)]
struct JsonReport<'a> {
    gate: &'a str,
    version: &'a str,
    generated_on: &'a str,
    cards: usize,
    hard_failures: usize,
    warnings: usize,
    info: usize,
    by_code: BTreeMap<String, usize>,
    findings: &'a [Finding],
}
