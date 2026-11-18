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
| Archive | SQLite `archive` | Admin `forget --id`. Hidden from retrieval. The text stays. |

A knowledge card whose `section` is `diary` is still a semantic row. It is a published card. The append-only diary is the table the CLI writes.

`galion-studio/obsidian-open-mind` `crates/openmind-memory` already speaks SQLite FTS5 for the Hermes memory gateway. This crate does not depend on it and does not modify that repo. The FTS query shape (a quoted OR of alphanumeric tokens, no dictionary) is the same idea as that crate's `fts.rs`. Tantivy is not linked. R1 leaves Tantivy on the research side band, not beside FTS5 on the diary path.

## Retrieval

One search does three things and publishes at most four hits.

1. **BM25.** SQLite FTS5 (`rusqlite` with the bundled SQLite, which includes FTS5). The tokenizer is `unicode61`, so a query token is the indexed term. A short English stopword list is removed at index time and at query time. On a diary of at least 64 rows, a term in more than 1/50 of the rows is not sent to FTS: its IDF is too small to pay for a full postings scan. The remaining terms go rarest-first, at most 8, and their document frequencies share one posting budget of that same cap. FTS5 returns them with `ORDER BY rank LIMIT 32`. A query that is only a stopword or a near-universal term has no lexical leg; the int8 scan still runs.
2. **Int8 vector.** Each row has one 256-dimensional vector, symmetric int8, one scale, stored as a blob and scanned from a contiguous in-memory arena. The vector is feature hashing (a token adds a signed count into two buckets), L2-normalised, then quantized. It is not a neural embedding. R1's hot-path class is a static table; this is that shape without vendoring a model. `fastembed` and `candle` are not dependencies. R1 records that `fastembed` pulls `ort`, and `LOCKS.toml` in the voice repo forbids `ort` and `candle` on the shipped voice path. On x86-64 the dot product uses AVX2 when the CPU has it, and a scalar loop otherwise.
3. **Fusion.** Reciprocal rank fusion, `1/(60+rank)`, across the BM25 list, the vector list, and a token-overlap list of the RAM ring. Cormack, Clarke, and Büttcher, SIGIR 2009, is the method. `k = 60` is the constant the voice V2 plan already used. The score on a hit is the fused score, not a probability.

The ring is included so the current call is searchable before `remember`. A ring hit has `source = "session-ring"`. Search reads `items` and the ring. It does not read `archive`.

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

Consent is given by use; there is no withdrawal command. If you don't agree, don't use it.

`forget --id` and `forget --mark` are admin tools. They are not a withdrawal flow.

| Command | Effect |
|---|---|
| `forget --mark --id ID` | The row stays in `items`, including its text, and drops out of FTS and the vector arena. A mark is a pause, not an archive. |
| `forget --id ID` | The row moves into `archive` with reason `forget` and leaves retrieval. The text is kept. The JSON card on disk is not touched. |

Owner decision, Mate, 2026-11-18: stored rows are archived, never deleted. A later decision the same day, 21:57, removes consent withdrawal. Using the system is consent. R3 had recommended a withdrawal that deletes user-text rows. That path is not in this crate. Decay over time is not implemented. R3 leaves the decay exponent as an owner knob with `literature = "none"`.

Same day, same owner: galion-boot and HORBM CPU-only mode are local-only. No API models. This crate does not call one. The embedder is the local hashing table on this machine, or a future local static table. An API embedding model is out of this stack.

## CLI

```bash
horbm-memory [--db PATH] ingest DIR
horbm-memory [--db PATH] search QUERY...
horbm-memory [--db PATH] remember --text TEXT --said-by WHO --date DATE --source SRC
horbm-memory [--db PATH] diary add --text TEXT --date DATE [--said-by WHO] [--source SRC]
horbm-memory [--db PATH] diary list
horbm-memory [--db PATH] forget --id ID
horbm-memory [--db PATH] forget --mark --id ID
horbm-memory [--db PATH] bench [--n N] [--queries N]
```

`forget --id` and `forget --mark` are admin tools. The default database path is `./horbm-memory.sqlite`. Search prints JSON. `bench` prints the latency report for the fixtures plus `N` synthetic cards.

Library entry points are `Store::open`, `ingest_dir`, `search`, `push_turn`, `remember`, `diary_add`, `diary_list`, `mark`, `forget`, and `archive_list`.

## What this crate does not do

- It does not run inside an 80 ms heartbeat, and it does not open audio. R4 puts retrieval off `Heartbeat::step`. Calling `search` is the host's job.
- It does not prefetch on partial speech. The host can call `search` while the person is still talking. A hit then costs nothing extra at the end of the turn. This process has no ear.
- It does not rank with a boosted tree, a cross-encoder, or a language model. R2 puts those off the live path. Fusion is reciprocal rank fusion.
- It does not build a knowledge graph or expand the query with triples. R1's Lane B is a later step.
- It does not download a model, and it does not call an API model. CPU-only mode is local-only (Mate, 2026-11-18).

## Measured latency

Command: `cargo build --release` then `horbm-memory bench`, on 2026-11-18.

Machine: Intel Xeon, 4 logical CPUs, x86_64, AVX2, rustc 1.83.0, this crate's release profile. The bench reported `"simd": "avx2"`. The clock is `Instant` around `Store::search` only (ingest is not included). Each figure is from that run. A later machine will differ. With 40 queries, p95 is the 95th percentile of those 40 samples.

`selective` is one rare token (`m{i}` on the generated cards, or `bm25` when the corpus is only the five fixtures). `broad` repeats one token that is in every generated card (`sample`), or the word `the` on the fixtures alone. The spot check on each run returned the expected top id (`robertson-bm25` or `sample-0`) with a speaker, a date, and a source.

| Corpus | Queries | Selective p50 | Selective p95 | Selective max | Broad p50 | Broad p95 | Broad max |
|---|---:|---:|---:|---:|---:|---:|---:|
| 5 fixture cards | 200 | 36 µs | 48 µs | 56 µs | 20 µs | 27 µs | 32 µs |
| 2,005 (5 + 2,000 generated) | 200 | 69 µs | 80 µs | 104 µs | 99 µs | 109 µs | 143 µs |
| 10,005 | 200 | 204 µs | 229 µs | 250 µs | 390 µs | 427 µs | 461 µs |
| 20,005 | 100 | 296 µs | 341 µs | 360 µs | 708 µs | 776 µs | 826 µs |
| 100,005 | 40 | 1,142 µs | 1,228 µs | 1,240 µs | 3,303 µs | 3,367 µs | 3,371 µs |

The 5 ms p95 target holds on this machine for a rare token through 100,005 rows (p95 1,228 µs) and for a token present in every generated row (p95 3,367 µs). `sample` is above the 1/50 document-frequency cap, so that broad query does not scan the FTS postings list. The time is the int8 scan plus fusion. The earlier run, before this planner, measured that same broad query at 5,704 µs p95 on 10,005 rows and 55,465 µs p95 on 100,005 rows. Spot checks still returned `robertson-bm25` and `sample-0`.

Debug `cargo test` is not this table. Debug is slower, and the tests do not assert a millisecond budget.

## Scale plan

The single SQLite file above is the diary. A corpus of millions of cards uses a second layout, `ScaleIndex`, measured with `horbm-memory scale-bench`. It keeps the same hit rule: at most four hits, and every hit still carries `source`, `date`, and `said_by`. Archive-never-delete and consent-by-use are unchanged. Shards are not edited in place.

The layout follows two published designs. A tiered inverted index searches a small high-quality tier before the rest of the shards, drops postings that cannot enter the top of the list, and caches a repeated query. Cloudflare Vectorize clusters vectors (IVF), stores product-quantized codes, and rescores the short list at full precision. Cloudflare AI Search fuses BM25 and vectors with reciprocal rank fusion, which this crate already does.

1. **Core pack.** Cards with `claim_type = fact` or `evidence_strength = strong` go into `core.sqlite`. That file stays open and is searched on every query, before any shard. In the 1,000,005-row run this was 5,003 cards.
2. **Shards.** Other cards are split by `section` and `category` into separate SQLite FTS5 files. The 1,000,005-row run made 13 files: the 12 world categories plus one HORBM category that held the non-fact fixtures. A rare term (document frequency 1) is recorded in a lexicon that names its shard. A query with such a term opens that shard. A query with no rare term is routed by shard centroid to the nearest 3 shards, searched on parallel threads. Tantivy was not used. FTS5 with the frequency cap and `ORDER BY rank LIMIT 32` is enough at this size, and it keeps one stack.
3. **Dense leg.** Each shard builds an IVF index (64 clusters, 4 probed) and 16-byte product-quantization codes (16 subspaces, 16 centroids each). The short list is rescored with the stored int8 vector. `faiss` was not linked: its Rust bindings need the C++ library. `hora` has IVF-PQ and is unmaintained, with its own index format. The codes here are the int8 vectors this crate already stores, so the clustering and the product quantization sit on that space and the refine step is the existing cosine.
4. **Cache.** An LRU of 128 queries. A repeated query does not touch FTS or the shards.
5. **On device, design only.** `manifest.json` is schema `galion-shard-manifest/1`. It is versioned and marked immutable. It names the core pack and each shard with a sha256 and a byte size. A device keeps the core pack and the shards the person chose. Any other shard is only a manifest row, to be fetched from the Galion open network by that hash. This crate does not fetch it. A correction publishes a new manifest. It does not rewrite a shard file.

### Measured at 1,000,005 rows

`horbm-memory scale-bench --n 1000000 --queries 40`, release build, 2026-11-18. Intel Xeon, 4 logical CPUs, AVX2. The corpus is 5 fixture cards plus 1,000,000 generated cards. Cold queries clear the LRU before each call. `selective` is `m{i}`. `broad` is `sample`, which is in every generated card. p95 of 40 queries is the 95th percentile of those 40 samples. The spot check returned `sample-0` with `said_by` Galion Labs, date `2026-11-18`, and the benchmark source URL.

| | p50 | p95 |
|---|---:|---:|
| Selective, cold | 1,859 µs | 2,230 µs |
| Broad, cold | 4,661 µs | 4,908 µs |
| Broad, cached repeat | <1 µs | <1 µs |

The cached figure is 0 µs from a clock that counts whole microseconds, so the hit was below 1 µs. Resident set size after the run: 308,822,016 bytes (294.5 MiB). Disk for the directory, including the manifest: 1,067,885,069 bytes (0.995 GiB).

### Projection for 100,000,000 rows

This projection is not a measurement. It scales the 1,000,005-row run and states the assumptions.

- **Disk.** Measured bytes per row are 1,067,885,069 / 1,000,005 = 1,067.88. The same short card, the same SQLite overhead, and 100,000,000 rows give 1,067.88 × 100,000,000 = 106,787,972,960 bytes, 99.45 GiB.
- **Latency.** A query in this design touches the fixed core pack and at most 3 shards, not the whole corpus. Holding a shard near the measured size (about 80,000 cards) means about 1,200 shards at 100 million cards. Picking 3 of them is a lexicon lookup or a centroid pass over those 1,200 centroids, which is a fraction of a millisecond at the measured per-vector rate, plus a shard search like the one already timed. Under that shard-size cap, a cold query stays on the order of the measured 2–5 ms. It does not grow 100×. That is an argument from the routing, not a run.
- **RAM.** The measured 294.5 MiB is mostly the rare-term lexicon (one unique marker per generated card) plus the PQ codes, not a full copy of every int8 vector. PQ codes are 16 bytes a row, so 100 million rows are 1.6 GB if every code stays resident. A lexicon with one unique string per card would be on the order of 10 GB and is the wrong shape for a real corpus. A production lexicon keeps terms that are rare across cards, or it lives on disk. The core pack stays a fixed tier, not 1% of 100 million, unless someone chooses a larger tier.

## Open questions

1. **S1 schema.** `v2/data/SCHEMA.md` was not published when this parser was written. If S1 renames a required field, ingest needs a matching change. Unknown keys are already ignored.
2. **Neural table.** R1's preferred dense leg is a static Model2Vec-class table (256-d, MIT software), rewritten as a tokenizer plus a matrix, not `fastembed` (it pulls `ort`) and not `candle` (locked out of the voice binary). This crate uses feature hashing so it builds with no model download. Recall of the hashing vectors on Galion dialogue was not measured. Swapping the `HashingEmbedder` for a vendored table is the upgrade, after the checkpoint licence is confirmed (R1 open question 6).
3. **A term just under the frequency cap.** The planner refuses a term in more than 1/50 of a large diary. A term at that boundary still asks FTS5 to score those postings. That boundary was not timed on its own. Tantivy was not added. The measured broad query, a term in every generated row, is under 5 ms p95 at 100,005 rows because it never reaches FTS.
4. **`share` and persona scope.** R3 asks whether one consent bit covers both the feeling stream and cross-persona reads. This index has no persona filter. World and HORBM cards are both searchable.
5. **Decay.** No strength, no time decay, no simhash merge. R3 wants those as a background job with an owner-set exponent. Not built.
6. **CJK.** Tokens are alphanumeric runs. A string of CJK with no spaces is one token. `openmind-memory` splits those into n-grams. This crate does not.
7. **Core pinning.** R1 and R4 disagree with the voice plan about which core runs retrieval, and both say it must not run inside the heartbeat. This crate does not pin a core.
