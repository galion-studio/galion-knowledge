# HORBM memory stack

Perpetual Open MIT License. Copyright (c) 2026 Galion Labs.

This is the diary and memory crate for knowledge.galion.app. The code is `v2/memory/` (`horbm-memory`). It ingests the card JSON files under `v2/data/cards/world/` and `v2/data/cards/horbm/` (and any other directory of the same shape) into one SQLite file, and it keeps HORBM's own short-term ring, episodes, and diary.

It follows the HORBM research notes in `galion-studio/galion-one-voice` (draft PRs [#209](https://github.com/galion-studio/galion-one-voice/pull/209) R1, [#210](https://github.com/galion-studio/galion-one-voice/pull/210) R2, [#208](https://github.com/galion-studio/galion-one-voice/pull/208) R3, [#207](https://github.com/galion-studio/galion-one-voice/pull/207) R4), read 2026-11-18. Those notes are research, not measurements. The latency table below is a measurement of this crate. The research numbers are not reused as if they were measured here.

## What it stores

Three places, matching R3's split of working memory, episodes, and sourced semantic rows.

| Place | Where | When it is written |
|---|---|---|
| Short-term ring | RAM, 32 turns, inside the process | `Store::push_turn`. The CLI is stateless, so the ring is for a host that keeps the process. |
| Episode | SQLite `layer = episode` | `remember` only. A turn that was not remembered is not on disk. |
| Semantic row | SQLite `layer = semantic` | `ingest`. One knowledge card, one row. |
| Diary | SQLite `layer = diary` | `diary add`. Append-only: there is no update command. |

A knowledge card whose `section` is `diary` is still a semantic row. It is a published card. The append-only diary is the table the CLI writes.

`galion-studio/obsidian-open-mind` `crates/openmind-memory` already speaks SQLite FTS5 for the Hermes memory gateway. This crate does not depend on it and does not modify that repo. The FTS query shape (a quoted OR of alphanumeric tokens, no dictionary) is the same idea as that crate's `fts.rs`. Tantivy is not linked. R1 leaves Tantivy on the research side band, not beside FTS5 on the diary path.

## Retrieval

One search does three things and publishes at most four hits.

1. **BM25.** SQLite FTS5 (`rusqlite` with the bundled SQLite, which includes FTS5). The tokenizer is `porter unicode61`. The query is up to 32 quoted tokens joined with `OR`. `bm25()` orders the matches. The internal pool is 32.
2. **Int8 vector.** Each row has one 256-dimensional vector, symmetric int8, one scale, stored as a blob and scanned from a contiguous in-memory arena. The vector is feature hashing (a token adds a signed count into two buckets), L2-normalised, then quantized. It is not a neural embedding. R1's hot-path class is a static table; this is that shape without vendoring a model. `fastembed` and `candle` are not dependencies. R1 records that `fastembed` pulls `ort`, and `LOCKS.toml` in the voice repo forbids `ort` and `candle` on the shipped voice path. On x86-64 the dot product uses AVX2 when the CPU has it, and a scalar loop otherwise.
3. **Fusion.** Reciprocal rank fusion, `1/(60+rank)`, across the BM25 list, the vector list, and a token-overlap list of the RAM ring. Cormack, Clarke, and Büttcher, SIGIR 2009, is the method. `k = 60` is the constant the voice V2 plan already used. The score on a hit is the fused score, not a probability.

The ring is included so the current call is searchable before `remember`. A ring hit has `source = "session-ring"`.

Every hit carries `said_by`, `date`, and `source`. An empty field is stored and returned as the literal `unknown`, so a missing speaker or date is visible (R2). For a card, the three fields are filled in this order:

- `said_by`: the card's `said_by`, else the first source author, else `unknown`
- `date`: `as_of_date`, else the first source date, else `unknown`
- `source`: the first source's title and URL, else a string `source` field, else `unknown`

The returned `text` is the card summary when it has one.

## Cards

S1 (`bc-fe88f5a4`) owns `v2/data/SCHEMA.md`. That file was not in the tree when this crate was written. The parser follows the field list S1 had planned, and it ignores unknown keys:

`id`, `title`, `section` (`world` | `horbm` | `diary`), `category`, `body`, `summary`, `claim_type` (`fact` | `interpretation` | `opinion` | `contested`), `sources[]` (`title`, `url`, `author`, `date`, `accessed`, `note`), `evidence_strength`, `said_by`, `as_of_date`, `status`, `tags`.

Aliases from the research notes are accepted: `text` for `body`, `gist` for `summary`, `speaker` for `said_by`, `epistemic` (`said` → `fact`, `inferred` → `interpretation`, `opinion` stays). A JSON object with no `id` (a catalog file) is skipped. `section` may be omitted when a parent directory is named `world`, `horbm`, or `diary`.

Sample cards live in `v2/memory/fixtures/`. They are fixtures for this tool, not the S2/S3 knowledge pack. Ingest the real pack with:

```bash
cargo run --release --manifest-path v2/memory/Cargo.toml -- --db horbm-memory.sqlite ingest v2/data/cards
```

Re-ingesting the same `id` replaces the row and clears a mark.

## Consent

| Command | Effect |
|---|---|
| `forget --mark --id ID` | The row stays, including its text, and drops out of FTS and the vector arena. A mark is not a privacy wipe. |
| `forget --id ID` | The row is deleted from this index. The JSON card on disk is not touched. |
| `forget --withdraw` | The RAM ring is cleared. Every episode and diary row is deleted. Ingested world and HORBM cards stay. |

R3's opinion, followed here: withdrawal deletes user text (episodes and the diary) and does not delete world knowledge. Decay over time is not implemented. R3 leaves the decay exponent as an owner knob with `literature = "none"`.

## CLI

```bash
horbm-memory [--db PATH] ingest DIR
horbm-memory [--db PATH] search QUERY...
horbm-memory [--db PATH] remember --text TEXT --said-by WHO --date DATE --source SRC
horbm-memory [--db PATH] diary add --text TEXT --date DATE [--said-by WHO] [--source SRC]
horbm-memory [--db PATH] diary list
horbm-memory [--db PATH] forget --id ID
horbm-memory [--db PATH] forget --mark --id ID
horbm-memory [--db PATH] forget --withdraw
horbm-memory [--db PATH] bench [--n N] [--queries N]
```

The default database path is `./horbm-memory.sqlite`. Search prints JSON. `bench` prints the latency report for the fixtures plus `N` synthetic cards.

Library entry points are `Store::open`, `ingest_dir`, `search`, `push_turn`, `remember`, `diary_add`, `diary_list`, `mark`, `forget`, and `withdraw`.

## What this crate does not do

- It does not run inside an 80 ms heartbeat, and it does not open audio. R4 puts retrieval off `Heartbeat::step`. Calling `search` is the host's job.
- It does not prefetch on partial speech. The host can call `search` while the person is still talking. A hit then costs nothing extra at the end of the turn. This process has no ear.
- It does not rank with a boosted tree, a cross-encoder, or a language model. R2 puts those off the live path. Fusion is reciprocal rank fusion.
- It does not build a knowledge graph or expand the query with triples. R1's Lane B is a later step.
- It does not download a model.

## Measured latency

Command: `cargo build --release` then `horbm-memory bench`, on 2026-11-18.

Machine: Intel Xeon, 4 logical CPUs, x86_64, AVX2, rustc 1.83.0, this crate's release profile. The bench reported `"simd": "avx2"`. The clock is `Instant` around `Store::search` only (ingest is not included). Each figure is from that run. A later machine will differ. With 40 queries, p95 is the 95th percentile of those 40 samples.

`selective` is one rare token (`m{i}` on the generated cards, or `bm25` when the corpus is only the five fixtures). `broad` repeats one token that is in every generated card (`sample`), or the word `the` on the fixtures alone. The spot check on each run returned the expected top id (`robertson-bm25` or `sample-0`) with a speaker, a date, and a source.

| Corpus | Queries | Selective p50 | Selective p95 | Selective max | Broad p50 | Broad p95 | Broad max |
|---|---:|---:|---:|---:|---:|---:|---:|
| 5 fixture cards | 200 | 27 µs | 30 µs | 38 µs | 33 µs | 37 µs | 85 µs |
| 2,005 (5 + 2,000 generated) | 200 | 65 µs | 82 µs | 111 µs | 911 µs | 1,009 µs | 1,107 µs |
| 10,005 | 200 | 194 µs | 222 µs | 289 µs | 5,568 µs | 5,704 µs | 9,600 µs |
| 20,005 | 100 | 319 µs | 350 µs | 387 µs | 11,145 µs | 11,272 µs | 11,411 µs |
| 100,005 | 40 | 1,274 µs | 1,400 µs | 1,432 µs | 54,841 µs | 55,465 µs | 55,893 µs |

The 5 ms p95 target from R1 holds on this machine for a rare token through 100,005 rows (p95 1,400 µs). It holds for a token that hits every generated row at 2,005 rows (p95 1,009 µs) and misses at 10,005 rows (p95 5,704 µs). The broad cost is FTS5 scoring a postings list that contains every generated card. The int8 scan is no longer the slow leg on the rare-token queries.

Debug `cargo test` is not this table. Debug is slower, and the tests do not assert a millisecond budget.

## Open questions

1. **S1 schema.** `v2/data/SCHEMA.md` was not published when this parser was written. If S1 renames a required field, ingest needs a matching change. Unknown keys are already ignored.
2. **Neural table.** R1's preferred dense leg is a static Model2Vec-class table (256-d, MIT software), rewritten as a tokenizer plus a matrix, not `fastembed` (it pulls `ort`) and not `candle` (locked out of the voice binary). This crate uses feature hashing so it builds with no model download. Recall of the hashing vectors on Galion dialogue was not measured. Swapping the `HashingEmbedder` for a vendored table is the upgrade, after the checkpoint licence is confirmed (R1 open question 6).
3. **Broad FTS5.** On this machine a token present in every row is over 5 ms p95 at 10,005 cards (5,704 µs) and about 55 ms p95 at 100,005. A rare token stays under 5 ms at 100,005 (1,400 µs) with the AVX2 scan. R1's 100,000-card estimate was not a claim that every query is that fast. An ANN index is still the wrong next step for the rare-token leg. The broad leg needs a cheaper way to score a postings list that hits most of the diary. Not built.
4. **`share` and persona scope.** R3 asks whether one consent bit covers both the feeling stream and cross-persona reads. This index has no persona filter. World and HORBM cards are both searchable.
5. **Decay.** No strength, no time decay, no simhash merge. R3 wants those as a background job with an owner-set exponent. Not built.
6. **CJK.** Tokens are alphanumeric runs. A string of CJK with no spaces is one token. `openmind-memory` splits those into n-grams. This crate does not.
7. **Core pinning.** R1 and R4 disagree with the voice plan about which core runs retrieval, and both say it must not run inside the heartbeat. This crate does not pin a core.
