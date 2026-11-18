// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use url::Url;

use crate::config::Config;

#[derive(Debug, Clone)]
pub struct RatedUrl {
    pub url: String,
    pub host: String,
    pub class: String,
    pub registrable: String,
    pub independence_key: String,
    pub voice: String,
    pub banned: bool,
    pub placeholder: bool,
    pub ip: bool,
}

pub fn host_matches(host: &str, suffix: &str) -> bool {
    let suffix = suffix.trim().trim_start_matches('.').to_ascii_lowercase();
    if suffix.is_empty() {
        return false;
    }
    host == suffix || host.ends_with(&format!(".{suffix}"))
}

pub fn is_banned(host: &str, config: &Config) -> bool {
    if config
        .banned_host_substrings
        .iter()
        .any(|part| !part.is_empty() && host.contains(part))
    {
        return true;
    }
    config
        .banned_suffixes
        .iter()
        .any(|suffix| host_matches(host, suffix))
}

pub fn is_placeholder(host: &str, config: &Config) -> bool {
    config
        .placeholder_suffixes
        .iter()
        .any(|suffix| host_matches(host, suffix))
}

/// Registrable host, enough to tell outlets apart. Not a full public-suffix list.
pub fn registrable(host: &str) -> String {
    let parts: Vec<&str> = host.split('.').filter(|part| !part.is_empty()).collect();
    if parts.len() < 2 {
        return host.to_string();
    }
    let last2 = format!("{}.{}", parts[parts.len() - 2], parts[parts.len() - 1]);
    const MULTI: &[&str] = &[
        "co.uk", "org.uk", "ac.uk", "gov.uk", "gov.au", "com.au", "edu.au", "gc.ca", "gov.tr",
        "gouv.fr", "co.jp", "com.br", "gov.br",
    ];
    if parts.len() >= 3 && MULTI.contains(&last2.as_str()) {
        return format!("{}.{last2}", parts[parts.len() - 3]);
    }
    last2
}

pub fn class_of(host: &str, config: &Config) -> String {
    if let Some(rule) = config
        .domains
        .iter()
        .find(|rule| host_matches(host, &rule.suffix))
    {
        return rule.class.clone();
    }
    if config
        .official_suffixes
        .iter()
        .any(|suffix| host.ends_with(suffix.as_str()))
    {
        return "official".to_string();
    }
    "other".to_string()
}

fn government_voice(host: &str, registrable: &str) -> String {
    if host.ends_with(".gov.uk") {
        return "government:uk".to_string();
    }
    if host.ends_with(".gov.au") {
        return "government:au".to_string();
    }
    if host.ends_with(".gov.tr") {
        return "government:tr".to_string();
    }
    if host.ends_with(".gouv.fr") {
        return "government:fr".to_string();
    }
    if host.ends_with(".gc.ca") {
        return "government:ca".to_string();
    }
    if host.ends_with(".gov") || host.ends_with(".mil") {
        return "government:us".to_string();
    }
    if host == "europa.eu" || host.ends_with(".europa.eu") {
        return "igo:eu".to_string();
    }
    if host.ends_with("un.org")
        || host.ends_with("who.int")
        || host.ends_with("unesco.org")
        || host.ends_with("unicef.org")
        || host.ends_with("unrwa.org")
        || host.ends_with("unep.org")
        || host.ends_with("worldbank.org")
        || host.ends_with("ipcc.ch")
        || host.ends_with("icj-cij.org")
        || host.ends_with("irmct.org")
    {
        return "igo:un".to_string();
    }
    if host == "home.cern" || host.ends_with(".cern.ch") || host == "cern.ch" {
        return "igo:cern".to_string();
    }
    format!("official:{registrable}")
}

pub fn voice_of(host: &str, class: &str, registrable: &str) -> String {
    match class {
        "peer_reviewed" | "preprint" => "academic".to_string(),
        "house" => "house".to_string(),
        "official" => government_voice(host, registrable),
        _ => format!("outlet:{registrable}"),
    }
}

fn independence_key(url: &Url, registrable: &str) -> String {
    let path = url.path().trim_matches('/');
    if registrable == "doi.org" && !path.is_empty() {
        return format!("doi:{}", path.to_ascii_lowercase());
    }
    if registrable == "arxiv.org" {
        let id = path
            .trim_start_matches("abs/")
            .trim_start_matches("pdf/")
            .trim_end_matches(".pdf");
        if !id.is_empty() {
            return format!("arxiv:{}", id.to_ascii_lowercase());
        }
    }
    format!("host:{registrable}")
}

/// Parse a source URL. `None` means it is not an http(s) URL with a host.
pub fn rate_url(raw: &str, config: &Config) -> Option<RatedUrl> {
    let raw = raw.trim();
    if raw.is_empty() {
        return None;
    }
    let url = Url::parse(raw).ok()?;
    if url.scheme() != "http" && url.scheme() != "https" {
        return None;
    }
    let host = url.host_str()?.trim_end_matches('.').to_ascii_lowercase();
    if host.is_empty() {
        return None;
    }
    let registrable = registrable(&host);
    let banned = is_banned(&host, config);
    let placeholder = is_placeholder(&host, config);
    let ip = crate::textutil::contains_ip(&host) || crate::textutil::contains_ip(raw);
    let class = if banned {
        "banned".to_string()
    } else {
        class_of(&host, config)
    };
    let voice = voice_of(&host, &class, &registrable);
    let independence_key = independence_key(&url, &registrable);
    Some(RatedUrl {
        url: raw.to_string(),
        host,
        class,
        registrable,
        independence_key,
        voice,
        banned,
        placeholder,
        ip,
    })
}

/// A URL that can support a claim: http(s), not banned, not a placeholder, not an IP.
pub fn is_real(rated: &RatedUrl) -> bool {
    !rated.banned && !rated.placeholder && !rated.ip
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn suffix_match_needs_a_dot_boundary() {
        assert!(host_matches("doi.org", "doi.org"));
        assert!(host_matches("www.doi.org", "doi.org"));
        assert!(!host_matches("notdoi.org", "doi.org"));
        assert!(host_matches("pmc.ncbi.nlm.nih.gov", "pmc.ncbi.nlm.nih.gov"));
        assert!(host_matches("pmc.ncbi.nlm.nih.gov", "ncbi.nlm.nih.gov"));
        assert!(!host_matches("example.com", "doi.org"));
    }

    #[test]
    fn registrable_keeps_compound_public_suffixes() {
        assert_eq!(registrable("www.legislation.gov.uk"), "legislation.gov.uk");
        assert_eq!(registrable("science.nasa.gov"), "nasa.gov");
        assert_eq!(registrable("doi.org"), "doi.org");
    }
}
