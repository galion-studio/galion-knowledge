// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::collections::{BTreeMap, BTreeSet};
use std::time::Duration;

use jsonschema::Draft;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::classify::{is_real, rate_url, RatedUrl};
use crate::config::Config;
use crate::error::{GateError, Result};
use crate::live::{finding_for_status, probe, Probe};
use crate::model::{rank, Card, CardFile, Catalog};
use crate::report::{Finding, Report, Severity};
use crate::textutil::{contains_ip, hits, jaccard, tokens};

pub struct Input<'a> {
    pub files: &'a [CardFile],
    pub schema: &'a Value,
    pub config: &'a Config,
    pub catalog: Option<&'a Catalog>,
    pub check_urls: bool,
    pub timeout: Duration,
}

struct Ready {
    path: String,
    card: Card,
    real_urls: Vec<RatedUrl>,
}

pub fn evaluate(input: &Input<'_>) -> Result<Report> {
    let validator = jsonschema::options()
        .with_draft(Draft::Draft202012)
        .build(input.schema)
        .map_err(|err| GateError::Schema(err.to_string()))?;

    let mut findings = Vec::new();
    let mut ready = Vec::new();
    let mut seen_ids: BTreeMap<String, String> = BTreeMap::new();

    for file in input.files {
        if let Some(err) = &file.parse_error {
            findings.push(finding(
                Severity::Hard,
                "invalid_json",
                "",
                &file.path,
                format!("The file is not valid JSON ({err})."),
                None,
            ));
            continue;
        }
        if !file.value.is_object() {
            findings.push(finding(
                Severity::Hard,
                "invalid_json",
                "",
                &file.path,
                "A card file must be a JSON object.".to_string(),
                None,
            ));
            continue;
        }

        let mut schema_errors = 0usize;
        for error in validator.iter_errors(&file.value) {
            schema_errors += 1;
            if schema_errors > 8 {
                continue;
            }
            let id = file
                .value
                .get("id")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            findings.push(finding(
                Severity::Hard,
                "schema",
                id,
                &file.path,
                format!("{error} ({})", error.instance_path()),
                None,
            ));
        }
        if schema_errors > 8 {
            findings.push(finding(
                Severity::Hard,
                "schema",
                "",
                &file.path,
                format!("{schema_errors} schema errors. The first 8 are listed."),
                None,
            ));
        }

        let card = match Card::deserialize(&file.value) {
            Ok(card) => card,
            Err(err) => {
                if schema_errors == 0 {
                    findings.push(finding(
                        Severity::Hard,
                        "schema",
                        "",
                        &file.path,
                        format!("The card could not be read ({err})."),
                        None,
                    ));
                }
                continue;
            }
        };

        let stem = file
            .path
            .rsplit('/')
            .next()
            .unwrap_or("")
            .trim_end_matches(".json");
        if card.id != stem {
            findings.push(finding(
                Severity::Hard,
                "id_filename",
                &card.id,
                &file.path,
                format!(
                    "id \"{}\" does not match the file name \"{stem}\".",
                    card.id
                ),
                None,
            ));
        }
        if let Some(previous) = seen_ids.insert(card.id.clone(), file.path.clone()) {
            findings.push(finding(
                Severity::Hard,
                "duplicate_id",
                &card.id,
                &file.path,
                format!("id \"{}\" is also used by {previous}.", card.id),
                None,
            ));
        }

        if matches!(card.section.as_str(), "world" | "horbm" | "diary")
            && card.section != file.folder
        {
            findings.push(finding(
                Severity::Hard,
                "section_mismatch",
                &card.id,
                &file.path,
                format!(
                    "section \"{}\" does not match the folder \"{}\".",
                    card.section, file.folder
                ),
                None,
            ));
        } else if !card.section.is_empty() && card.section != file.folder {
            findings.push(finding(
                Severity::Warn,
                "section_unlisted",
                &card.id,
                &file.path,
                format!(
                    "section \"{}\" is not world, horbm, or diary. The folder \"{}\" is the pack.",
                    card.section, file.folder
                ),
                None,
            ));
        }

        let mut rated = Vec::new();
        for source in card.sources.iter().chain(
            card.contested_views
                .iter()
                .flat_map(|view| view.sources.iter()),
        ) {
            if source.url.trim().is_empty() {
                continue;
            }
            match rate_url(&source.url, input.config) {
                Some(url) => {
                    if url.banned {
                        findings.push(finding(
                            Severity::Hard,
                            "banned_source",
                            &card.id,
                            &file.path,
                            format!(
                                "Host {} is on the banned list. Wikipedia and its mirrors and derivatives are not sources.",
                                url.host
                            ),
                            Some(json!({"host": url.host})),
                        ));
                    }
                    if url.ip {
                        findings.push(finding(
                            Severity::Hard,
                            "ip_address",
                            &card.id,
                            &file.path,
                            "A source URL uses an IP address.".to_string(),
                            None,
                        ));
                    }
                    rated.push(url);
                }
                None => {
                    findings.push(finding(
                        Severity::Hard,
                        "bad_url",
                        &card.id,
                        &file.path,
                        "A source URL is not an http or https URL with a host.".to_string(),
                        None,
                    ));
                }
            }
        }

        for (label, text) in [
            ("title", card.title.as_str()),
            ("summary", card.summary.as_str()),
            ("body", card.body.as_str()),
            ("said_by", card.said_by.as_str()),
            ("status", card.status.as_str()),
        ] {
            if contains_ip(text) {
                findings.push(finding(
                    Severity::Hard,
                    "ip_address",
                    &card.id,
                    &file.path,
                    format!("{label} contains an IP address."),
                    None,
                ));
            }
        }

        // Contested-view sources were checked for bans above. Evidence uses the card's own sources.
        drop(rated);
        let evidence_urls: Vec<RatedUrl> = card
            .sources
            .iter()
            .filter_map(|source| rate_url(&source.url, input.config))
            .filter(is_real)
            .collect();

        check_evidence(
            &mut findings,
            &card,
            &file.path,
            &evidence_urls,
            input.config,
        );
        check_claim(
            &mut findings,
            &card,
            &file.path,
            &evidence_urls,
            input.config,
        );
        check_words(&mut findings, &card, &file.path, input.config);
        check_status(&mut findings, &card, &file.path, input.config);
        check_category(&mut findings, &card, &file.path, input.catalog);

        ready.push(Ready {
            path: file.path.clone(),
            card,
            real_urls: evidence_urls,
        });
    }

    check_links(&mut findings, &ready);
    check_duplicates(&mut findings, &ready, input.config);
    check_diversity(&mut findings, &ready, input.config);
    if input.check_urls {
        check_live(&mut findings, &ready, input.timeout);
    }

    findings.sort_by(|left, right| {
        severity_rank(left.severity)
            .cmp(&severity_rank(right.severity))
            .then(left.code.cmp(&right.code))
            .then(left.card_id.cmp(&right.card_id))
            .then(left.path.cmp(&right.path))
            .then(left.message.cmp(&right.message))
    });

    Ok(Report {
        generated_on: crate::textutil::utc_date(),
        card_count: ready.len(),
        findings,
    })
}

fn share_reaches(count: usize, total: usize, threshold: f64) -> bool {
    count as f64 >= threshold * total as f64 - 1e-9
}

fn severity_rank(severity: Severity) -> u8 {
    match severity {
        Severity::Hard => 0,
        Severity::Warn => 1,
        Severity::Info => 2,
    }
}

fn finding(
    severity: Severity,
    code: &str,
    card_id: &str,
    path: &str,
    message: String,
    detail: Option<Value>,
) -> Finding {
    Finding {
        severity,
        code: code.to_string(),
        card_id: card_id.to_string(),
        path: path.to_string(),
        message,
        detail,
    }
}

fn best_ceiling(classes: &[String], sources_present: bool, config: &Config) -> (String, String) {
    if classes.is_empty() {
        if sources_present {
            return ("weak".to_string(), "no-real-url".to_string());
        }
        return ("none".to_string(), "no-source".to_string());
    }
    let mut best_rank = 0u8;
    let mut best_label = "weak";
    let mut best_class = classes[0].as_str();
    for class in classes {
        let label = config.ceiling_of(class);
        let class_rank = rank(label).unwrap_or(1);
        if class_rank > best_rank || (class_rank == best_rank && class.as_str() < best_class) {
            best_rank = class_rank;
            best_label = label;
            best_class = class.as_str();
        }
    }
    (best_label.to_string(), best_class.to_string())
}

fn check_evidence(
    findings: &mut Vec<Finding>,
    card: &Card,
    path: &str,
    real_urls: &[RatedUrl],
    config: &Config,
) {
    let classes: Vec<String> = real_urls.iter().map(|url| url.class.clone()).collect();
    let (ceiling, best_class) = best_ceiling(&classes, !card.sources.is_empty(), config);
    if card.sources.is_empty() {
        if card.evidence_strength != "none" {
            findings.push(finding(
                Severity::Hard,
                "strength_without_sources",
                &card.id,
                path,
                format!(
                    "Evidence is {}. A card with no sources is none.",
                    card.evidence_strength
                ),
                Some(json!({"current": card.evidence_strength, "ceiling": "none"})),
            ));
        }
    } else if card.evidence_strength == "none" {
        findings.push(finding(
            Severity::Hard,
            "none_with_sources",
            &card.id,
            path,
            "Evidence is none and the card still has sources. none means no source is attached."
                .to_string(),
            Some(json!({"current": "none", "ceiling": ceiling})),
        ));
    } else if meets_rank(&card.evidence_strength, &ceiling) {
        findings.push(finding(
            Severity::Hard,
            "evidence_above_ceiling",
            &card.id,
            path,
            format!(
                "Evidence is {}. The sources support {ceiling} at most (best class {best_class}).",
                card.evidence_strength
            ),
            Some(json!({
                "current": card.evidence_strength,
                "ceiling": ceiling,
                "best_class": best_class
            })),
        ));
    }

    if card.evidence_strength == "strong" {
        let keys: BTreeSet<&str> = real_urls
            .iter()
            .map(|url| url.independence_key.as_str())
            .collect();
        if keys.len() == 1 {
            findings.push(finding(
                Severity::Warn,
                "strong_single_source",
                &card.id,
                path,
                "Strong rests on one independent source. Two independent sources are the usual bar."
                    .to_string(),
                Some(json!({"independence_key": keys.iter().next().copied().unwrap_or("")})),
            ));
        }
        let preprint = real_urls.iter().any(|url| url.class == "preprint");
        let stronger = real_urls.iter().any(|url| {
            matches!(
                url.class.as_str(),
                "peer_reviewed" | "official" | "primary_text" | "dataset"
            )
        });
        if preprint && !stronger {
            findings.push(finding(
                Severity::Warn,
                "strong_on_preprint",
                &card.id,
                path,
                "Strong rests on a preprint. A preprint is the authors' own manuscript, and it is not a completed peer review.".to_string(),
                None,
            ));
        }
    }

    if card.claim_type == "fact" && card.evidence_strength == "weak" && rank(&ceiling) == Some(3) {
        findings.push(finding(
            Severity::Info,
            "sources_stronger_than_label",
            &card.id,
            path,
            "The sources could support a higher evidence label. This gate does not raise labels."
                .to_string(),
            Some(json!({"current": "weak", "ceiling": ceiling})),
        ));
    }
}

fn meets_rank(current: &str, ceiling: &str) -> bool {
    rank(current)
        .zip(rank(ceiling))
        .is_some_and(|(current, cap)| current > cap)
}

fn check_claim(
    findings: &mut Vec<Finding>,
    card: &Card,
    path: &str,
    real_urls: &[RatedUrl],
    _config: &Config,
) {
    if card.claim_type == "fact" && real_urls.is_empty() {
        findings.push(finding(
            Severity::Hard,
            "fact_without_real_url",
            &card.id,
            path,
            "A fact needs at least one real source URL. No URL was invented to fill this."
                .to_string(),
            None,
        ));
    }
    if card.evidence_strength == "strong" && real_urls.is_empty() {
        findings.push(finding(
            Severity::Hard,
            "strong_without_real_url",
            &card.id,
            path,
            "Strong needs at least one real source URL.".to_string(),
            None,
        ));
    }
    if card.claim_type == "fact"
        && !real_urls.is_empty()
        && real_urls.iter().all(|url| url.class == "house")
    {
        findings.push(finding(
            Severity::Warn,
            "fact_house_only",
            &card.id,
            path,
            "This fact is sourced only to a house document. The URL is real. It is not an outside finding.".to_string(),
            None,
        ));
    }
    if card.claim_type == "opinion" && card.evidence_strength == "strong" {
        let classes: Vec<String> = real_urls.iter().map(|url| url.class.clone()).collect();
        let (ceiling, _) = best_ceiling(&classes, !card.sources.is_empty(), _config);
        if rank(&ceiling).unwrap_or(0) >= 3 {
            findings.push(finding(
                Severity::Warn,
                "opinion_marked_strong",
                &card.id,
                path,
                "This card is an opinion labeled strong. A design choice that cites research is still a house rule on the evidence scale, unless the claim is the source's own finding.".to_string(),
                None,
            ));
        }
    }
    if card.claim_type == "contested" {
        if card.contested_views.is_empty() {
            findings.push(finding(
                Severity::Hard,
                "contested_without_views",
                &card.id,
                path,
                "claim_type is contested and contested_views is empty. Disagreement stays side by side. Do not invent a side that the card does not already state.".to_string(),
                None,
            ));
        } else if card.contested_views.len() == 1 {
            findings.push(finding(
                Severity::Warn,
                "contested_single_view",
                &card.id,
                path,
                "A contested card has only one view recorded.".to_string(),
                None,
            ));
        }
        let keys: BTreeSet<&str> = real_urls
            .iter()
            .map(|url| url.independence_key.as_str())
            .collect();
        if keys.len() < 2 {
            findings.push(finding(
                Severity::Warn,
                "contested_single_source",
                &card.id,
                path,
                format!(
                    "This contested card has {} independent source{}.",
                    keys.len(),
                    if keys.len() == 1 { "" } else { "s" }
                ),
                None,
            ));
        }
    }

    let elevated = card.claim_type == "fact" || card.evidence_strength == "strong";
    let speaker_gap = card.said_by.trim().is_empty();
    let date_gap = card.as_of_date.trim().is_empty();
    if elevated && speaker_gap {
        findings.push(finding(
            Severity::Warn,
            "missing_speaker",
            &card.id,
            path,
            "said_by is empty on a fact or a strong card. Leave it empty only when the speaker is unknown. Do not invent a name.".to_string(),
            None,
        ));
    }
    if elevated && date_gap {
        findings.push(finding(
            Severity::Warn,
            "missing_date",
            &card.id,
            path,
            "as_of_date is empty on a fact or a strong card.".to_string(),
            None,
        ));
    }
    if !elevated && (speaker_gap || date_gap) {
        findings.push(finding(
            Severity::Info,
            "attribution_unknown",
            &card.id,
            path,
            "Speaker or date is empty. That is allowed when it is unknown.".to_string(),
            None,
        ));
    }
}

fn check_words(findings: &mut Vec<Finding>, card: &Card, path: &str, config: &Config) {
    let text = format!("{}\n{}\n{}", card.title, card.summary, card.body);
    if card.claim_type == "fact" {
        let found = hits(&text, &config.loaded_phrases);
        if !found.is_empty() {
            findings.push(finding(
                Severity::Warn,
                "loaded_language",
                &card.id,
                path,
                format!(
                    "Fact card uses loaded or propaganda wording: {}. This is a flag, not a rejection.",
                    found.join(", ")
                ),
                Some(json!({"phrases": found})),
            ));
        }
    }
    let mentions = hits(&text, &config.mention_phrases);
    if !mentions.is_empty() {
        findings.push(finding(
            Severity::Warn,
            "mentions_wikipedia",
            &card.id,
            path,
                format!(
                "The card text names {}. That is not a source. Confirm the sentence does not treat it as evidence.",
                mentions.join(", ")
            ),
            Some(json!({"phrases": mentions})),
        ));
    }
}

fn check_status(findings: &mut Vec<Finding>, card: &Card, path: &str, config: &Config) {
    if card.status.to_ascii_lowercase().contains("unsourced") && !card.sources.is_empty() {
        findings.push(finding(
            Severity::Hard,
            "unsourced_has_sources",
            &card.id,
            path,
            "Status says unsourced and the sources array is not empty.".to_string(),
            None,
        ));
    }
    if !config
        .recommended_statuses
        .iter()
        .any(|status| status == &card.status)
    {
        findings.push(finding(
            Severity::Warn,
            "status_unlisted",
            &card.id,
            path,
            format!(
                "Status \"{}\" is outside the review labels (draft, sourced, sourced - needs review, unsourced - needs review, reviewed, archived).",
                card.status
            ),
            None,
        ));
    }
}

fn check_category(findings: &mut Vec<Finding>, card: &Card, path: &str, catalog: Option<&Catalog>) {
    let Some(catalog) = catalog else {
        return;
    };
    let matches: Vec<_> = catalog
        .categories
        .iter()
        .filter(|category| category.id == card.category)
        .collect();
    if matches.is_empty() {
        findings.push(finding(
            Severity::Warn,
            "category_not_in_catalog",
            &card.id,
            path,
            format!(
                "Category \"{}\" is not in catalog.json. The site still lists the card.",
                card.category
            ),
            Some(json!({"category": card.category, "section": card.section})),
        ));
    } else if !matches
        .iter()
        .any(|category| category.section == card.section)
    {
        findings.push(finding(
            Severity::Warn,
            "category_section_mismatch",
            &card.id,
            path,
            format!(
                "Category \"{}\" is filed under {} in the catalog, and this card's section is {}.",
                card.category, matches[0].section, card.section
            ),
            Some(json!({
                "category": card.category,
                "card_section": card.section,
                "catalog_section": matches[0].section
            })),
        ));
    }
}

fn check_links(findings: &mut Vec<Finding>, ready: &[Ready]) {
    let ids: BTreeSet<&str> = ready.iter().map(|item| item.card.id.as_str()).collect();
    let mut alias_owner: BTreeMap<&str, &str> = BTreeMap::new();
    for item in ready {
        for alias in &item.card.aliases {
            if alias == &item.card.id {
                continue;
            }
            if ids.contains(alias.as_str()) {
                findings.push(finding(
                    Severity::Warn,
                    "alias_collision",
                    &item.card.id,
                    &item.path,
                    format!("Alias \"{alias}\" is another card's id."),
                    None,
                ));
            }
            if let Some(owner) = alias_owner.insert(alias.as_str(), item.card.id.as_str()) {
                if owner != item.card.id.as_str() {
                    findings.push(finding(
                        Severity::Warn,
                        "alias_collision",
                        &item.card.id,
                        &item.path,
                        format!("Alias \"{alias}\" is also used by {owner}."),
                        None,
                    ));
                }
            }
        }
    }
    let alias_keys: BTreeSet<&str> = alias_owner.keys().copied().collect();
    for item in ready {
        for related in &item.card.related {
            if !ids.contains(related.as_str()) && !alias_keys.contains(related.as_str()) {
                findings.push(finding(
                    Severity::Warn,
                    "dangling_related",
                    &item.card.id,
                    &item.path,
                    format!("related id \"{related}\" does not match a card or an alias."),
                    None,
                ));
            }
        }
    }
}

fn check_duplicates(findings: &mut Vec<Finding>, ready: &[Ready], config: &Config) {
    struct Bag {
        id: String,
        path: String,
        all: BTreeSet<String>,
        title: BTreeSet<String>,
        body: BTreeSet<String>,
    }
    let bags: Vec<Bag> = ready
        .iter()
        .map(|item| {
            let all_text = format!(
                "{} {} {}",
                item.card.title, item.card.summary, item.card.body
            );
            Bag {
                id: item.card.id.clone(),
                path: item.path.clone(),
                all: tokens(&all_text),
                title: tokens(&item.card.title),
                body: tokens(&item.card.body),
            }
        })
        .collect();
    for i in 0..bags.len() {
        for j in (i + 1)..bags.len() {
            let left = &bags[i];
            let right = &bags[j];
            let all = jaccard(&left.all, &right.all);
            let title = jaccard(&left.title, &right.title);
            let body = jaccard(&left.body, &right.body);
            let by_text = all >= config.near_duplicate_jaccard
                && left.all.len() >= 25
                && right.all.len() >= 25;
            let by_title = title >= config.title_jaccard
                && body >= config.body_jaccard_with_title
                && left.title.len() >= 3
                && left.body.len() >= 20
                && right.body.len() >= 20;
            if !(by_text || by_title) {
                continue;
            }
            let (first, second) = if left.id <= right.id {
                (left, right)
            } else {
                (right, left)
            };
            let rule = if by_text { "text" } else { "title-and-body" };
            findings.push(finding(
                Severity::Warn,
                "near_duplicate",
                &first.id,
                &first.path,
                format!(
                    "Near-duplicate of {}. Shared-word score is {:.2}. The cards were not merged and neither file was deleted.",
                    second.id, all
                ),
                Some(json!({
                    "other_id": second.id,
                    "jaccard": (all * 100.0).round() / 100.0,
                    "title_jaccard": (title * 100.0).round() / 100.0,
                    "body_jaccard": (body * 100.0).round() / 100.0,
                    "rule": rule
                })),
            ));
        }
    }
}

fn check_diversity(findings: &mut Vec<Finding>, ready: &[Ready], config: &Config) {
    let mut topics: BTreeMap<(String, String), Vec<&RatedUrl>> = BTreeMap::new();
    for item in ready {
        let key = (item.card.section.clone(), item.card.category.clone());
        topics.entry(key).or_default().extend(item.real_urls.iter());
    }
    for ((section, category), urls) in topics {
        let total = urls.len();
        if total == 0 {
            continue;
        }
        if total >= config.outlet_min_urls {
            let mut domains: BTreeMap<&str, usize> = BTreeMap::new();
            for url in &urls {
                *domains.entry(url.registrable.as_str()).or_default() += 1;
            }
            for (domain, count) in domains {
                if config.resolver_domains.iter().any(|item| item == domain) {
                    continue;
                }
                let share = count as f64 / total as f64;
                if share_reaches(count, total, config.outlet_share) {
                    findings.push(finding(
                        Severity::Warn,
                        "outlet_dominates",
                        "",
                        &format!("{section}/{category}"),
                        format!(
                            "In {section}/{category}, {domain} is {count} of {total} source URLs ({:.0}%). One outlet accounts for most of this topic.",
                            share * 100.0
                        ),
                        Some(json!({
                            "section": section,
                            "category": category,
                            "domain": domain,
                            "count": count,
                            "total": total,
                            "share": (share * 1000.0).round() / 1000.0
                        })),
                    ));
                }
            }
        }
        if total >= config.voice_min_urls {
            let mut voices: BTreeMap<&str, usize> = BTreeMap::new();
            for url in &urls {
                if url.voice.starts_with("government:") || url.voice.starts_with("igo:") {
                    *voices.entry(url.voice.as_str()).or_default() += 1;
                }
            }
            for (voice, count) in voices {
                let share = count as f64 / total as f64;
                if share_reaches(count, total, config.voice_share) {
                    findings.push(finding(
                        Severity::Warn,
                        "voice_dominates",
                        "",
                        &format!("{section}/{category}"),
                        format!(
                            "In {section}/{category}, {voice} is {count} of {total} source URLs ({:.0}%). One government or institution accounts for most of this topic.",
                            share * 100.0
                        ),
                        Some(json!({
                            "section": section,
                            "category": category,
                            "voice": voice,
                            "count": count,
                            "total": total,
                            "share": (share * 1000.0).round() / 1000.0
                        })),
                    ));
                }
            }
        }
    }
}

fn check_live(findings: &mut Vec<Finding>, ready: &[Ready], timeout: Duration) {
    let mut users: BTreeMap<String, Vec<(String, String)>> = BTreeMap::new();
    for item in ready {
        for url in &item.real_urls {
            users
                .entry(url.url.clone())
                .or_default()
                .push((item.card.id.clone(), item.path.clone()));
        }
    }
    for (url, cards) in users {
        let code = match probe(&url, timeout) {
            Probe::Status(status) => finding_for_status(status).map(|name| {
                let message = match name {
                    "url_missing" => format!("{url} returned {status}."),
                    "url_blocked" => format!(
                        "{url} returned {status}. The host refused the check. That is not proof the link is dead."
                    ),
                    _ => format!("{url} returned {status}."),
                };
                (name, message)
            }),
            Probe::Transport(err) => {
                let err = crate::textutil::redact_ips(&err);
                let err = if err.chars().count() > 180 {
                    let clipped: String = err.chars().take(180).collect();
                    format!("{clipped}…")
                } else {
                    err
                };
                Some((
                    "url_unchecked",
                    format!("{url} could not be checked ({err})."),
                ))
            }
        };
        if let Some((name, message)) = code {
            for (id, path) in cards {
                findings.push(finding(
                    Severity::Warn,
                    name,
                    &id,
                    &path,
                    message.clone(),
                    Some(json!({"url": url})),
                ));
            }
        }
    }
}
