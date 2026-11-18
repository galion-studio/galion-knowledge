// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::path::PathBuf;

use horbm_memory::{parse_cards, synthetic_card, Card, Stack, Store, MAX_HITS};

fn cards_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../data/cards")
}

fn scratch(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "horbm-{name}-{}-{}",
        std::process::id(),
        name.len()
    ));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn open_stack(dir: &std::path::Path) -> Stack {
    Stack::open(dir.join("memory.sqlite"), dir.join("knowledge")).unwrap()
}

#[test]
fn imports_the_real_pack_and_keeps_every_field() {
    let dir = scratch("pack");
    let mut stack = open_stack(&dir);
    let first = stack.import_dir(cards_dir()).unwrap();
    assert!(first.cards >= 400, "cards {}", first.cards);
    assert!(first.rebuilt);
    assert!(first.core_rows > 0);
    assert!(first.shard_count > 1);
    let second = stack.import_dir(cards_dir()).unwrap();
    assert!(!second.rebuilt);
    assert_eq!(second.unchanged, first.cards);
    assert_eq!(second.revised, 0);
    assert_eq!(stack.revision_count().unwrap(), 0);

    let card = stack.latest_card("world.free-will-disputed").unwrap();
    assert_eq!(card.claim_type, "contested");
    assert!(card.contested_views.len() >= 3);
    assert!(card.document.contains("contested_views"));
    assert!(card.document.contains("legacy"));
    assert!(!card.sources.is_empty());
    assert!(!card.sources[0].url.is_empty());
    assert_eq!(card.evidence_strength, "moderate");
    assert!(!card.said_by.is_empty());
    assert!(!card.date.is_empty());

    let found = stack.query("compatibilist").unwrap();
    assert!(found.confident, "answer {}", found.answer);
    assert!(found.answer.is_empty());
    assert!(found
        .knowledge
        .iter()
        .any(|hit| hit.item_id == "world.free-will-disputed"));
    let hit = found
        .knowledge
        .iter()
        .find(|hit| hit.item_id == "world.free-will-disputed")
        .unwrap();
    assert_eq!(hit.pool, "knowledge");
    assert_eq!(hit.claim_type, "contested");
    assert_eq!(hit.evidence, "moderate");
    assert!(hit.contested_views.len() >= 3);
    assert!(!hit.said_by.is_empty());
    assert!(!hit.date.is_empty());
    assert!(hit.source.contains("http"));
    assert!(found.memory.iter().all(|hit| hit.pool == "memory"));
    assert!(found.knowledge.len() + found.memory.len() <= MAX_HITS);
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn memory_is_not_returned_as_knowledge() {
    let dir = scratch("pools");
    let mut stack = open_stack(&dir);
    stack.import_dir(cards_dir()).unwrap();
    stack.push_turn(
        "please keep the word marigold in this call",
        "the person",
        "2026-11-18",
    );
    let memory = stack.query("marigold").unwrap();
    assert_eq!(memory.answer, "I don't know");
    assert!(memory.knowledge.is_empty());
    assert_eq!(memory.memory[0].pool, "memory");
    assert_eq!(memory.memory[0].claim_type, "user-said");
    assert_eq!(memory.memory[0].source, "session-ring");
    assert!(memory.memory.iter().all(|hit| hit.pool == "memory"));
    assert!(memory.gap_id.is_some());

    stack
        .remember(
            "the person said the private word marigold",
            "the person",
            "2026-11-18",
            "conversation",
        )
        .unwrap();
    let kept = stack.query("marigold").unwrap();
    assert!(kept
        .memory
        .iter()
        .any(|hit| hit.layer == "episode" && hit.pool == "memory"));
    assert!(kept.knowledge.iter().all(|hit| hit.pool == "knowledge"));
    assert!(kept
        .knowledge
        .iter()
        .all(|hit| hit.claim_type != "user-said"));
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn a_miss_is_logged_and_the_queue_ranks_it() {
    let dir = scratch("gaps");
    let mut stack = open_stack(&dir);
    let missed = stack.query("zzznothingmatches").unwrap();
    assert_eq!(missed.answer, "I don't know");
    assert!(!missed.confident);
    assert!(missed.knowledge.is_empty());
    let queue = stack.gap_queue().unwrap();
    assert_eq!(queue[0].query, "zzznothingmatches");
    assert_eq!(queue[0].advice, "ask_galion_research");
    assert!(queue[0].detail.contains("Galion Research"));
    stack.query("zzznothingmatches").unwrap();
    stack.query("othergap").unwrap();
    let queue = stack.gap_queue().unwrap();
    assert_eq!(queue[0].query, "zzznothingmatches");
    assert_eq!(queue[0].times, 2);
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn low_confidence_names_the_nearest_cards() {
    let dir = scratch("near");
    let mut stack = open_stack(&dir);
    stack
        .import_cards(vec![synthetic_card(1), synthetic_card(2)], false)
        .unwrap();
    let missed = stack.query("sample zzznone").unwrap();
    assert_eq!(missed.answer, "I don't know");
    let queue = stack.gap_queue().unwrap();
    assert_eq!(queue[0].advice, "revise_card");
    assert!(queue[0].detail.contains("sample-"));
    assert!(queue[0].nearest.contains("sample-"));
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn an_unloaded_shard_is_the_gap_to_load() {
    let dir = scratch("shard");
    let mut stack = open_stack(&dir);
    let mut cards = Vec::new();
    for i in 0..20 {
        cards.push(synthetic_card(i));
    }
    stack.import_cards(cards, false).unwrap();
    assert!(stack.shard_count() >= 1);
    let unloaded = stack.unload_shard("world-history");
    assert!(unloaded);
    let marker = (0..20).find(|i| i % 5 == 0 && i % 4 == 0).unwrap();
    let response = stack.query(&format!("m{marker}")).unwrap();
    assert_eq!(response.answer, "I don't know");
    assert!(response.knowledge.is_empty());
    let queue = stack.gap_queue().unwrap();
    assert_eq!(queue[0].advice, "load_shard");
    assert!(queue[0].detail.contains("world-history"));
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn revising_a_card_archives_the_old_text_and_search_reads_the_new_one() {
    let dir = scratch("revise");
    let mut stack = open_stack(&dir);
    stack.import_dir(cards_dir()).unwrap();
    let current = stack.latest_card("world.free-will-disputed").unwrap();
    assert!(current.document.contains("Stanford"));
    let mut value: serde_json::Value = serde_json::from_str(&current.document).unwrap();
    value["summary"] = serde_json::json!("Revised summary token quokkaweek.");
    value["body"] = serde_json::json!("Revised body token quokkaweek.");
    let revised = parse_cards(&value, "world/world.free-will-disputed.json")
        .unwrap()
        .pop()
        .unwrap();
    let report = stack.apply_card(&revised).unwrap();
    assert!(report.rebuilt);
    assert_eq!(report.revised, 1);
    let found = stack.query("quokkaweek").unwrap();
    assert!(found.confident);
    assert_eq!(found.knowledge[0].item_id, "world.free-will-disputed");
    assert!(found.knowledge[0].text.contains("quokkaweek"));
    assert_eq!(found.knowledge[0].claim_type, "contested");
    assert!(found.knowledge[0].contested_views.len() >= 3);
    let old = stack.query("counted").unwrap();
    assert!(old
        .knowledge
        .iter()
        .all(|hit| hit.item_id != "world.free-will-disputed"));
    let archived = stack.revisions("world.free-will-disputed").unwrap();
    assert_eq!(archived.len(), 1);
    assert_eq!(archived[0].reason, "replaced");
    assert!(archived[0].document.contains("re-counted"));
    assert!(!archived[0].document.contains("quokkaweek"));
    let again = stack.apply_card(&revised).unwrap();
    assert!(!again.rebuilt);
    assert_eq!(
        stack.revisions("world.free-will-disputed").unwrap().len(),
        1
    );
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn a_card_removed_from_the_pack_is_archived_not_deleted() {
    let dir = scratch("absent");
    let mut stack = open_stack(&dir);
    let cards = vec![synthetic_card(1), synthetic_card(2)];
    stack.import_cards(cards.clone(), false).unwrap();
    stack.import_cards(vec![cards[0].clone()], false).unwrap();
    assert!(stack.query("m2").unwrap().knowledge.is_empty());
    let archived = stack.revisions("sample-2").unwrap();
    assert_eq!(archived.len(), 1);
    assert_eq!(archived[0].reason, "absent");
    assert!(archived[0].document.contains("marker m2"));
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn the_single_file_store_also_archives_a_changed_card() {
    let mut store = Store::open_in_memory().unwrap();
    let mut card = sample_store_card("keep", "first wording alpha");
    store.upsert_card(&card).unwrap();
    card = sample_store_card("keep", "second wording beta");
    store.upsert_card(&card).unwrap();
    let hits = store.search("beta").unwrap();
    assert_eq!(hits.hits[0].item_id, "keep");
    assert_eq!(hits.hits[0].pool, "knowledge");
    assert!(store.search("alpha").unwrap().hits.is_empty());
    let revisions = store.revisions_for("keep").unwrap();
    assert_eq!(revisions.len(), 1);
    assert!(revisions[0].document.contains("alpha"));
    store.upsert_card(&card).unwrap();
    assert_eq!(store.revision_count().unwrap(), 1);
}

fn sample_store_card(id: &str, summary: &str) -> Card {
    let raw = serde_json::json!({
        "id": id,
        "title": id,
        "section": "world",
        "category": "science",
        "summary": summary,
        "body": summary,
        "claim_type": "fact",
        "sources": [{
            "title": "fixture",
            "url": "https://example.test/keep",
            "author": "Ada Lovelace",
            "date": "1843",
            "accessed": "2026-11-18"
        }],
        "said_by": "Ada Lovelace",
        "as_of_date": "1843",
        "status": "draft",
        "contested_views": [],
        "related": []
    });
    parse_cards(&raw, "world/keep.json").unwrap().pop().unwrap()
}

#[test]
fn measured_corpus_at_the_target_size() {
    // Debug `cargo test` stays small. The release test is the 200k measurement.
    let n = if cfg!(debug_assertions) { 40 } else { 200_000 };
    let queries = if cfg!(debug_assertions) { 5 } else { 40 };
    let dir = scratch("measure");
    let mut stack = open_stack(&dir);
    let cards: Vec<Card> = (0..n).map(synthetic_card).collect();
    let expect_core = cards
        .iter()
        .filter(|card| card.claim_type == "fact")
        .count();
    let imported = stack.import_cards(cards, false).unwrap();
    assert_eq!(imported.cards, n);
    assert_eq!(imported.core_rows, expect_core);
    assert!(imported.shard_count >= 1);
    assert!(imported.shard_count <= 4);

    let mut selective = Vec::with_capacity(queries);
    for i in 0..queries {
        stack.clear_cache();
        let response = stack.query(&format!("m{}", (i * 17) % n)).unwrap();
        assert!(response.confident, "m{} {}", (i * 17) % n, response.answer);
        assert!(response.knowledge.iter().all(|hit| hit.pool == "knowledge"));
        assert!(response.memory.is_empty());
        selective.push(response.took_us as u64);
    }
    let mut broad = Vec::with_capacity(queries);
    for _ in 0..queries {
        stack.clear_cache();
        let response = stack.query("sample").unwrap();
        assert!(response.confident);
        assert!(!response.knowledge.is_empty());
        broad.push(response.took_us as u64);
    }
    stack.clear_cache();
    let spot = stack.query("m1").unwrap();
    let top_id = spot.knowledge[0].item_id.clone();
    let top_pool = spot.knowledge[0].pool.clone();
    let top_layer = spot.knowledge[0].layer.clone();
    let top_claim = spot.knowledge[0].claim_type.clone();
    let top_evidence = spot.knowledge[0].evidence.clone();
    let top_said = spot.knowledge[0].said_by.clone();
    let top_date = spot.knowledge[0].date.clone();
    let top_source = spot.knowledge[0].source.clone();
    assert!(spot.memory.is_empty());
    if n >= 200_000 {
        let rss = horbm_memory::rss_bytes();
        let disk = stack.disk_bytes().unwrap();
        let selective_p50_us = percentile(&mut selective, 0.50);
        let selective_p95_us = percentile(&mut selective, 0.95);
        let broad_p50_us = percentile(&mut broad, 0.50);
        let broad_p95_us = percentile(&mut broad, 0.95);
        let report = serde_json::json!({
            "rows": n,
            "core_rows": imported.core_rows,
            "shard_count": imported.shard_count,
            "queries": queries,
            "selective_p50_us": selective_p50_us,
            "selective_p95_us": selective_p95_us,
            "broad_p50_us": broad_p50_us,
            "broad_p95_us": broad_p95_us,
            "rss_bytes": rss,
            "disk_bytes": disk,
            "spot_id": top_id,
            "simd": horbm_memory::simd_lane(),
        });
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("target/stack-measure.json");
        std::fs::write(&path, serde_json::to_string_pretty(&report).unwrap()).unwrap();
        eprintln!("{report}");
        assert!(rss > 0);
        // The int8 vectors alone are 256 bytes a row. A non-recursive
        // directory walk would miss index/ and report a much smaller file.
        assert!(disk > n as u64 * 256, "disk {disk}");
    }
    assert_eq!(top_id, "sample-1");
    assert_eq!(top_pool, "knowledge");
    assert_eq!(top_layer, "core");
    assert_eq!(top_claim, "fact");
    assert_eq!(top_evidence, "strong");
    assert_eq!(top_said, "Galion Labs");
    assert_eq!(top_date, "2026-11-18");
    assert!(top_source.contains("galion-knowledge"));

    let again = stack
        .import_cards((0..n).map(synthetic_card).collect(), false)
        .unwrap();
    assert!(!again.rebuilt);
    assert_eq!(again.unchanged, n);
    assert_eq!(stack.revision_count().unwrap(), 0);
    let _ = std::fs::remove_dir_all(&dir);
}

fn percentile(samples: &mut [u64], p: f64) -> u64 {
    samples.sort_unstable();
    if samples.is_empty() {
        return 0;
    }
    let rank = ((p * samples.len() as f64).ceil() as usize).saturating_sub(1);
    samples[rank.min(samples.len() - 1)]
}
