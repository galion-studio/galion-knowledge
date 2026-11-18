// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

/// Lowercase alphanumeric tokens. The query is a quoted OR of these tokens,
/// the same shape `openmind-memory` uses for its FTS5 leg, without that
/// crate's CJK dictionary. A run longer than 64 characters is dropped.
pub fn tokens(raw: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut cur = String::new();
    for ch in raw.chars() {
        if ch.is_alphanumeric() {
            for c in ch.to_lowercase() {
                cur.push(c);
            }
        } else if !cur.is_empty() {
            push_token(&mut out, &mut cur);
        }
    }
    if !cur.is_empty() {
        push_token(&mut out, &mut cur);
    }
    out
}

fn push_token(out: &mut Vec<String>, cur: &mut String) {
    if cur.len() <= 64 {
        out.push(std::mem::take(cur));
    } else {
        cur.clear();
    }
}

/// FTS5 MATCH string. `None` when the query has no usable token.
pub fn fts_match_query(raw: &str) -> Option<String> {
    let toks = tokens(raw);
    if toks.is_empty() {
        return None;
    }
    let parts: Vec<String> = toks
        .into_iter()
        .take(32)
        .map(|t| format!("\"{t}\""))
        .collect();
    Some(parts.join(" OR "))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quotes_and_joins() {
        assert_eq!(
            fts_match_query("Hello, BM25!").as_deref(),
            Some("\"hello\" OR \"bm25\"")
        );
        assert_eq!(fts_match_query("  ,,, "), None);
    }
}
