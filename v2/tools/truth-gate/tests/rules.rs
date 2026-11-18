use std::path::PathBuf;
use std::time::Duration;

use serde_json::{json, Value};
use truth_gate::{
    evaluate, load_cards, load_catalog, load_schema, prepare, run, CardFile, Config, DomainRule,
    Input, Options,
};

fn schema() -> Value {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../data/schema.json");
    load_schema(&path).expect("schema")
}

fn config() -> Config {
    prepare(Config {
        banned_suffixes: vec![
            "wikipedia.org".into(),
            "wikimedia.org".into(),
            "dbpedia.org".into(),
        ],
        banned_host_substrings: vec!["wikipedia".into(), "wikiwand".into(), "wikiless".into()],
        mention_phrases: vec!["wikipedia".into(), "wikidata".into()],
        placeholder_suffixes: vec!["example.com".into(), "localhost".into()],
        resolver_domains: vec!["doi.org".into()],
        official_suffixes: vec![".gov".into()],
        ceilings: [
            ("peer_reviewed", "strong"),
            ("preprint", "strong"),
            ("official", "strong"),
            ("primary_text", "strong"),
            ("dataset", "strong"),
            ("scholarly_secondary", "moderate"),
            ("house", "weak"),
            ("news", "weak"),
            ("other", "weak"),
        ]
        .into_iter()
        .map(|(key, value)| (key.to_string(), value.to_string()))
        .collect(),
        near_duplicate_jaccard: 0.40,
        title_jaccard: 0.45,
        body_jaccard_with_title: 0.22,
        outlet_share: 0.60,
        outlet_min_urls: 6,
        voice_share: 0.75,
        voice_min_urls: 8,
        recommended_statuses: vec![
            "draft".into(),
            "sourced".into(),
            "sourced - needs review".into(),
            "unsourced - needs review".into(),
            "reviewed".into(),
            "archived".into(),
        ],
        loaded_phrases: vec!["hoax".into(), "so-called".into(), "nazi".into()],
        domains: vec![
            rule("pmc.ncbi.nlm.nih.gov", "peer_reviewed"),
            rule("ncbi.nlm.nih.gov", "official"),
            rule("doi.org", "peer_reviewed"),
            rule("arxiv.org", "preprint"),
            rule("github.com", "house"),
            rule("wikisource.org", "primary_text"),
            rule("openstax.org", "scholarly_secondary"),
            rule("nytimes.com", "news"),
        ],
    })
    .expect("config")
}

fn rule(suffix: &str, class: &str) -> DomainRule {
    DomainRule {
        suffix: suffix.into(),
        class: class.into(),
    }
}

fn card(id: &str, patch: Value) -> CardFile {
    let mut value = json!({
        "id": id,
        "title": "A measured claim",
        "section": "world",
        "category": "science",
        "summary": "One sentence a person can scan.",
        "body": "The claim is stated here, with enough words that a short fixture is still a card and not an empty file.",
        "claim_type": "interpretation",
        "sources": [],
        "evidence_strength": "none",
        "said_by": "A. Person",
        "as_of_date": "2026-11-18",
        "status": "unsourced - needs review",
        "contested_views": [],
        "related": []
    });
    if let (Some(base), Some(patch)) = (value.as_object_mut(), patch.as_object()) {
        for (key, item) in patch {
            base.insert(key.clone(), item.clone());
        }
    }
    CardFile {
        path: format!("world/{id}.json"),
        folder: "world".into(),
        value,
        parse_error: None,
    }
}

fn source(url: &str) -> Value {
    json!({
        "title": "The paper",
        "url": url,
        "author": "A. Person",
        "date": "2020",
        "accessed": "2026-11-18"
    })
}

fn gate(files: &[CardFile]) -> truth_gate::Report {
    let schema = schema();
    let config = config();
    evaluate(&Input {
        files,
        schema: &schema,
        config: &config,
        catalog: None,
        check_urls: false,
        timeout: Duration::from_secs(1),
    })
    .expect("evaluate")
}

fn hard(report: &truth_gate::Report, code: &str) -> bool {
    report
        .codes(code)
        .iter()
        .any(|finding| matches!(finding.severity, truth_gate::Severity::Hard))
}

#[test]
fn wikipedia_and_its_mirrors_are_hard_failures() {
    let files = [
        card(
            "wiki-card",
            json!({
                "claim_type": "fact",
                "evidence_strength": "moderate",
                "status": "sourced",
                "sources": [source("https://en.wikipedia.org/wiki/Example")]
            }),
        ),
        card(
            "wand-card",
            json!({
                "claim_type": "fact",
                "evidence_strength": "weak",
                "status": "sourced",
                "sources": [source("https://www.wikiwand.com/en/Example")]
            }),
        ),
    ];
    let report = gate(&files);
    assert!(hard(&report, "banned_source"));
    assert_eq!(report.codes("banned_source").len(), 2);
    assert_ne!(report.exit_code(), 0);
}

#[test]
fn wikisource_is_a_primary_text_not_a_wikipedia_mirror() {
    let files = [card(
        "origin",
        json!({
            "claim_type": "fact",
            "evidence_strength": "strong",
            "status": "sourced",
            "sources": [source("https://en.wikisource.org/wiki/On_the_Origin_of_Species_(1859)")]
        }),
    )];
    let report = gate(&files);
    assert!(report.codes("banned_source").is_empty());
    assert!(report.codes("evidence_above_ceiling").is_empty());
    assert_eq!(report.codes("strong_single_source").len(), 1);
    assert_eq!(report.exit_code(), 0);
}

#[test]
fn fact_without_a_url_fails_and_a_doi_does_not() {
    let bare = card(
        "bare-fact",
        json!({"claim_type": "fact", "evidence_strength": "strong", "status": "sourced"}),
    );
    let sourced = card(
        "doi-fact",
        json!({
            "claim_type": "fact",
            "evidence_strength": "strong",
            "status": "sourced",
            "sources": [source("https://doi.org/10.1000/one"), source("https://doi.org/10.1000/two")]
        }),
    );
    let bare_report = gate(&[bare]);
    assert!(hard(&bare_report, "fact_without_real_url"));
    assert!(hard(&bare_report, "strong_without_real_url"));
    let sourced_report = gate(&[sourced]);
    assert_eq!(sourced_report.exit_code(), 0);
    assert!(sourced_report.codes("strong_single_source").is_empty());
}

#[test]
fn house_documents_cannot_carry_strong() {
    let files = [card(
        "house-rule",
        json!({
            "claim_type": "fact",
            "evidence_strength": "strong",
            "status": "sourced",
            "section": "horbm",
            "category": "persona",
            "sources": [source("https://github.com/galion-studio/galion-one-voice/blob/main/README.md")]
        }),
    )];
    // folder must match section
    let mut file = files.into_iter().next().unwrap();
    file.folder = "horbm".into();
    file.path = "horbm/house-rule.json".into();
    let report = gate(&[file]);
    assert!(hard(&report, "evidence_above_ceiling"));
    let detail = report.codes("evidence_above_ceiling")[0]
        .detail
        .as_ref()
        .unwrap();
    assert_eq!(detail["ceiling"], "weak");
    assert_eq!(detail["best_class"], "house");
}

#[test]
fn openstax_alone_caps_at_moderate() {
    let files = [card(
        "textbook",
        json!({
            "claim_type": "fact",
            "evidence_strength": "strong",
            "status": "sourced",
            "sources": [source("https://openstax.org/books/biology-2e/pages/1-1")]
        }),
    )];
    let report = gate(&files);
    assert_eq!(
        report.codes("evidence_above_ceiling")[0]
            .detail
            .as_ref()
            .unwrap()["ceiling"],
        "moderate"
    );
}

#[test]
fn a_government_host_can_support_strong() {
    let files = [card(
        "agency",
        json!({
            "claim_type": "fact",
            "evidence_strength": "strong",
            "status": "sourced",
            "sources": [source("https://www.noaa.gov/climate")]
        }),
    )];
    let report = gate(&files);
    assert!(report.codes("evidence_above_ceiling").is_empty());
    assert_eq!(report.exit_code(), 0);
}

#[test]
fn longer_host_suffix_wins() {
    let files = [card(
        "pmc-paper",
        json!({
            "claim_type": "fact",
            "evidence_strength": "strong",
            "status": "sourced",
            "sources": [source("https://www.pmc.ncbi.nlm.nih.gov/articles/PMC1/")]
        }),
    )];
    let report = gate(&files);
    assert!(report.codes("evidence_above_ceiling").is_empty());
}

#[test]
fn contested_without_views_fails_and_views_pass() {
    let empty = card(
        "open-question",
        json!({
            "claim_type": "contested",
            "evidence_strength": "moderate",
            "status": "sourced",
            "sources": [source("https://doi.org/10.1000/one")]
        }),
    );
    let filled = card(
        "open-question-kept",
        json!({
            "claim_type": "contested",
            "evidence_strength": "moderate",
            "status": "sourced",
            "sources": [source("https://doi.org/10.1000/one"), source("https://doi.org/10.1000/two")],
            "contested_views": [
                {"label": "One reading", "summary": "The first reading already in the card.", "status": "sourced"},
                {"label": "Other reading", "summary": "The second reading already in the card.", "status": "sourced"}
            ]
        }),
    );
    assert!(hard(&gate(&[empty]), "contested_without_views"));
    let kept = gate(&[filled]);
    assert!(kept.codes("contested_without_views").is_empty());
    assert!(kept.codes("contested_single_source").is_empty());
    assert_eq!(kept.exit_code(), 0);
}

#[test]
fn loaded_words_are_flags_not_hard_failures() {
    let files = [card(
        "loaded",
        json!({
            "claim_type": "fact",
            "evidence_strength": "strong",
            "status": "sourced",
            "title": "The so-called result",
            "body": "The paper calls the claim a hoax in the sentence under review. The rest of the body is long enough to remain a normal card about a measurement.",
            "sources": [source("https://doi.org/10.1000/one"), source("https://doi.org/10.1000/two")]
        }),
    )];
    let report = gate(&files);
    assert_eq!(report.exit_code(), 0);
    assert_eq!(report.codes("loaded_language").len(), 1);
    let phrases = &report.codes("loaded_language")[0].detail.as_ref().unwrap()["phrases"];
    assert!(phrases.as_array().unwrap().len() >= 2);
}

#[test]
fn schema_rejects_an_unknown_field_and_accepts_history() {
    let extra = card("extra-field", json!({"invented": true}));
    let history = card(
        "with-history",
        json!({
            "legacy": {"v1_article_id": "4", "v1_slug": "old", "v1_category": "science", "note": "Not a truth score."},
            "history": [{
                "date": "2026-11-18",
                "change": "evidence_strength",
                "from": "strong",
                "to": "moderate",
                "note": "The sources support moderate."
            }]
        }),
    );
    assert!(hard(&gate(&[extra]), "schema"));
    let report = gate(&[history]);
    assert!(
        report.codes("schema").is_empty(),
        "{:?}",
        report.codes("schema")
    );
    assert_eq!(report.exit_code(), 0);
}

#[test]
fn an_ip_address_is_a_hard_failure_and_is_not_copied_into_the_message() {
    let files = [card(
        "has-ip",
        json!({
            "body": "A note that must not keep 192.0.2.10 in the published report text either, and this sentence is long enough to be a body."
        }),
    )];
    let report = gate(&files);
    assert!(hard(&report, "ip_address"));
    let message = &report.codes("ip_address")[0].message;
    assert!(!message.contains("192.0.2.10"));
}

#[test]
fn none_with_sources_fails() {
    let files = [card(
        "labeled-none",
        json!({
            "evidence_strength": "none",
            "status": "unsourced - needs review",
            "sources": [source("https://doi.org/10.1000/one")]
        }),
    )];
    let report = gate(&files);
    assert!(hard(&report, "none_with_sources"));
    assert!(hard(&report, "unsourced_has_sources"));
}

#[test]
fn near_duplicates_are_warnings() {
    let body = "Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega and then the same list again so the token set is large enough for the near duplicate rule to apply to both cards.";
    let files = [
        card("copy-a", json!({"title": "Same claim", "body": body})),
        card("copy-b", json!({"title": "Same claim", "body": body})),
    ];
    let report = gate(&files);
    assert_eq!(report.exit_code(), 0);
    assert_eq!(report.codes("near_duplicate").len(), 1);
}

#[test]
fn one_outlet_dominating_a_topic_is_a_warning() {
    let mut files = Vec::new();
    for index in 0..6 {
        files.push(card(
            &format!("news-{index}"),
            json!({
                "claim_type": "interpretation",
                "evidence_strength": "weak",
                "status": "sourced - needs review",
                "category": "society",
                "sources": [source("https://www.nytimes.com/2020/01/01/example.html")]
            }),
        ));
    }
    let report = gate(&files);
    assert_eq!(report.exit_code(), 0);
    assert!(!report.codes("outlet_dominates").is_empty());
}

#[test]
fn placeholder_url_is_not_a_real_source() {
    let files = [card(
        "placeholder",
        json!({
            "claim_type": "fact",
            "evidence_strength": "weak",
            "status": "sourced",
            "sources": [source("https://example.com/not-a-source")]
        }),
    )];
    let report = gate(&files);
    assert!(hard(&report, "fact_without_real_url"));
}

#[test]
fn live_status_codes_do_not_need_a_network() {
    assert_eq!(truth_gate::live_status(200), None);
    assert_eq!(truth_gate::live_status(404), Some("url_missing"));
    assert_eq!(truth_gate::live_status(403), Some("url_blocked"));
    assert_eq!(truth_gate::live_status(500), Some("url_unchecked"));
}

#[test]
fn the_published_pack_has_no_hard_failures() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
    let report = run(&Options {
        cards_dir: root.join("data/cards"),
        schema_path: root.join("data/schema.json"),
        config_path: PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("truth-gate.toml"),
        catalog_path: Some(root.join("data/catalog.json")),
        check_urls: false,
        timeout: Duration::from_secs(1),
    })
    .expect("pack");
    assert!(
        report.hard_count() == 0,
        "{}\n{}",
        report.summary(),
        report
            .findings
            .iter()
            .filter(|finding| matches!(finding.severity, truth_gate::Severity::Hard))
            .take(12)
            .map(|finding| format!("{} {} {}", finding.code, finding.card_id, finding.message))
            .collect::<Vec<_>>()
            .join("\n")
    );
    assert!(report.card_count >= 400);
    let _ = load_cards(&root.join("data/cards")).expect("cards still load");
    let _ = load_catalog(&root.join("data/catalog.json")).expect("catalog");
}
