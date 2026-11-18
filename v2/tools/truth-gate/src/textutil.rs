// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::collections::BTreeSet;
use std::sync::LazyLock;

use regex::Regex;

static IP: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b")
        .expect("ip pattern")
});

pub fn contains_ip(text: &str) -> bool {
    IP.is_match(text)
}

pub fn tokens(text: &str) -> BTreeSet<String> {
    let mut out = BTreeSet::new();
    let mut current = String::new();
    for ch in text.chars() {
        if ch.is_ascii_alphanumeric() {
            current.push(ch.to_ascii_lowercase());
        } else if !current.is_empty() {
            out.insert(std::mem::take(&mut current));
        }
    }
    if !current.is_empty() {
        out.insert(current);
    }
    out
}

pub fn jaccard(left: &BTreeSet<String>, right: &BTreeSet<String>) -> f64 {
    if left.is_empty() || right.is_empty() {
        return 0.0;
    }
    let intersection = left.intersection(right).count();
    let union = left.union(right).count();
    intersection as f64 / union as f64
}

pub fn phrase_hit(text: &str, phrase: &str) -> bool {
    let text = text.to_lowercase();
    let phrase = phrase.to_lowercase();
    if phrase.is_empty() {
        return false;
    }
    let mut start = 0;
    while let Some(found) = text[start..].find(&phrase) {
        let at = start + found;
        if !text.is_char_boundary(at) {
            start += found + 1;
            continue;
        }
        let end = at + phrase.len();
        if end > text.len() || !text.is_char_boundary(end) {
            break;
        }
        let before_ok = text[..at]
            .chars()
            .next_back()
            .map(|ch| !ch.is_alphanumeric())
            .unwrap_or(true);
        let after_ok = text[end..]
            .chars()
            .next()
            .map(|ch| !ch.is_alphanumeric())
            .unwrap_or(true);
        if before_ok && after_ok {
            return true;
        }
        start = end;
    }
    false
}

pub fn redact_ips(text: &str) -> String {
    IP.replace_all(text, "[ip]").into_owned()
}

pub fn hits<'a>(text: &str, phrases: &'a [String]) -> Vec<&'a str> {
    phrases
        .iter()
        .filter(|phrase| phrase_hit(text, phrase))
        .map(String::as_str)
        .collect()
}

/// Days since 1970-01-01 to a civil date. Howard Hinnant's `civil_from_days`.
pub fn ymd_from_unix_days(days: i64) -> (i32, u32, u32) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y as i32, m as u32, d as u32)
}

pub fn utc_date() -> String {
    let days = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs() / 86_400)
        .unwrap_or(0) as i64;
    let (y, m, d) = ymd_from_unix_days(days);
    format!("{y:04}-{m:02}-{d:02}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn phrases_respect_word_boundaries() {
        assert!(phrase_hit("a so-called fact", "so-called"));
        assert!(!phrase_hit("culture and agriculture", "cult"));
        assert!(!phrase_hit("the nazis", "nazi"));
        assert!(phrase_hit("the nazis", "nazis"));
        assert!(phrase_hit("Fake News tonight", "fake news"));
        assert!(!phrase_hit("regiment", "regime"));
    }

    #[test]
    fn civil_dates_from_unix_days() {
        assert_eq!(ymd_from_unix_days(0), (1970, 1, 1));
        assert_eq!(ymd_from_unix_days(10957), (2000, 1, 1));
        assert_eq!(ymd_from_unix_days(20000), (2024, 10, 4));
        assert_eq!(ymd_from_unix_days(20775), (2026, 11, 18));
    }
}
