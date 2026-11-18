# HORBM memory and knowledge

Perpetual Open MIT License. Copyright (c) 2026 Galion Labs.

`v2/memory` (`horbm-memory`) is the memory of a conversation and the index of the knowledge cards. The cards live in `v2/data/cards` and follow [`../data/SCHEMA.md`](../data/SCHEMA.md). The site reads those files. This crate is what HORBM and Galion Research search.

The size this is built for is a core pack of about 50,000 to 200,000 cards, plus a few shards. A hundred million cards is not the target.

## Two pools

A query searches both pools and returns them in separate lists. It does not fuse their scores. A sentence the user said is never returned as a world card, and a card is never returned as something the user said.

| Pool | What it is | Where it lives |
|---|---|---|
| Memory | The current call, an episode, a diary line | RAM ring of 32 turns. Episodes and the diary are SQLite. |
| Knowledge | A card from the pack | Core pack, or one shard |

Memory is written in three ways:

- `push_turn` keeps a turn in RAM. It is gone when the process exits.
- `remember` is the only way a turn becomes an episode on disk.
- `diary add` appends a dated line. There is no command to edit a diary line.

Knowledge is written by `import` (or `rebuild`) from the card files.

## Import

```bash
horbm-memory --knowledge horbm-knowledge import v2/data/cards
horbm-memory --knowledge horbm-knowledge rebuild v2/data/cards
```

`import` reads every card JSON file. The stored document is that JSON, so the fields are kept: `sources` (title, url, author, date, accessed, note), `said_by`, `as_of_date`, `claim_type`, `evidence_strength`, `contested_views`, `related`, `aliases`, `tags`, `legacy`, and any other key on the object.

Running `import` again, with the same files, does nothing. A changed card appends the previous JSON to the revision archive and republishes the index. `rebuild` republishes the index even when every hash matches. The card files are the latest text. The index can be thrown away and built again from them.

Cards with `claim_type = fact` or `evidence_strength = strong` go in the core pack (`index/core.sqlite`). That file is searched on every query. Every other card goes to a shard named by section and category (`index/shard-<section>-<category>.sqlite`). Shards are not edited in place. A new import writes new files and a new `manifest.json`.

The manifest is schema `galion-shard-manifest/1`. It names the core pack and each shard with a sha256 and a byte size, and it is marked immutable. A device can keep the core pack and the shards it has chosen. Any other shard is only a manifest row. This crate does not download it. A correction publishes a new manifest.

## Query

Library: `Stack::query`. CLI:

```bash
horbm-memory --db horbm-memory.sqlite --knowledge horbm-knowledge query WORDS...
```

The answer has at most four hits. `knowledge` and `memory` are separate arrays. When both pools have a hit, each keeps a slot inside that four.

Every hit carries `source`, `date`, `said_by`, `claim_type`, and `evidence`. A contested card also carries `contested_views`. An empty speaker or date is the literal `unknown`. A memory hit has `pool = memory` and `claim_type = user-said`. A card has `pool = knowledge` and the card's own claim type.

A hit is used only when every query token, after stopwords are removed, appears in that hit. If no knowledge card qualifies, `answer` is `I don't know`. A memory hit does not fill that in. The words for a missing fact are the ones on the card `horbm-say-i-dont-know`: say it, and do not invent the source.

`search` still queries one SQLite file (the diary path and any cards ingested into that file). `query` is the call that sees memory and the card index together.

## Gaps

A knowledge miss is appended to the gap log: the query, the time, and the nearest cards. `gaps` prints that log as a queue, the most repeated query first.

| Advice | Meaning |
|---|---|
| `revise_card` | Write or revise the nearest cards. Their ids are in the line. |
| `load_shard` | A rare term names a shard that is in the manifest and not loaded. |
| `ask_galion_research` | Nothing in the pack is close, or the index is not loaded. Write a card, and ask Galion Research. |

```bash
horbm-memory --knowledge horbm-knowledge gaps
```

## Revisions

Card history is append-only. When a card's JSON changes, the previous document is inserted into `revisions.sqlite` with the time and the reason `replaced`. A card that disappears from the pack is archived with reason `absent` and leaves the search index. Search reads the latest copy only. There is no command that deletes a revision.

```bash
horbm-memory --knowledge horbm-knowledge revisions --id world.free-will-disputed
horbm-memory --knowledge horbm-knowledge card --id world.free-will-disputed
```

`card` prints the latest JSON. `revisions` prints the older ones.

## Consent

Consent is given by use. There is no withdrawal command. If you don't agree, don't use it.

`forget --id` and `forget --mark` are admin tools. They are not a withdrawal flow.

| Command | Effect |
|---|---|
| `forget --mark --id ID` | The row stays, including its text, and drops out of retrieval. |
| `forget --id ID` | The row moves into `archive`. Retrieval does not read it. The text stays. The card file on disk is not touched. |

Owner decision, Mate, 2026-11-18: stored rows are archived, never deleted. A later decision the same day removes consent withdrawal. Using the system is consent. Decay over time is not implemented.

Same day: galion-boot and HORBM CPU-only mode are local-only. No API models. This crate does not call one. The vectors are the local hashing table on this machine.

## How a query is scored

Inside one pool, three lists are fused with reciprocal rank fusion, `1/(60+rank)`, and at most four hits are kept. The score is the fused score, not a probability.

1. **BM25.** SQLite FTS5 (`rusqlite`, bundled SQLite). Stopwords are removed. On a file of at least 64 rows, a term in more than 1/50 of the rows is not sent to FTS. The remaining terms go rarest-first, at most eight, `ORDER BY rank LIMIT 32`.
2. **Int8 vector.** One 256-dimensional vector per row, feature hashing, L2-normalised, one scale. It is not a neural embedding. The core pack scans those vectors exactly. On x86-64 the dot product uses AVX2 when the CPU has it. A shard uses an IVF index (64 lists, 4 probed) and 16-byte product-quantization codes, then rescores a short list with the stored int8 vector. `faiss` and `hora` are not linked. Tantivy is not linked.
3. **The ring.** Token overlap on the 32 turns in RAM, so the current call is searchable before `remember`.

A repeated query hits an LRU of 128 entries.

A term that appears in at most 32 cards of a shard is recorded in a lexicon that names that shard. The query opens that shard, up to three shards. A query with no such term is routed by shard centroid, again at most three.

## Measured at 200,000 cards

`cargo test --release --test whole measured_corpus_at_the_target_size`, 2026-11-18.

The corpus is 200,000 generated cards: 160,000 in the core pack (`fact` and `strong`) and 40,000 across 4 shards. It is not the knowledge pack. The clock is `Stack::query` after the index is built. Each cold query clears the LRU first. Forty queries. `selective` is one rare token `m{i}`. `broad` is `sample`, which is on every generated card and is above the 1/50 document-frequency cap, so that query does not scan the FTS postings list. The spot check returned `sample-1` from the core pack, pool `knowledge`, claim `fact`, evidence `strong`, said by Galion Labs, date `2026-11-18`, source the benchmark URL. A second import of the same cards did not rebuild and did not add a revision.

Machine: Intel Xeon, 4 logical CPUs, x86-64, AVX2, rustc 1.83.0, this crate's release profile.

| | p50 | p95 |
|---|---:|---:|
| Selective, cold | 3,137 µs | 4,621 µs |
| Broad, cold | 7,659 µs | 8,051 µs |

Resident set size after the queries, `VmRSS`: 685,543,424 bytes (654.0 MiB). Disk for the knowledge directory, including the index, the manifest, and the revision file: 416,927,985 bytes (397.6 MiB). The release test that built this index and ran these queries finished in 46.86 s. That figure includes the build. The table does not.

Debug `cargo test` runs this path at 40 cards. It does not assert a millisecond budget. The figures above are the release run only.

## Footnote on a larger corpus

An earlier draft of this file measured 1,000,005 rows and then projected disk and latency for 100,000,000 rows. That projection is not a measurement, and 100,000,000 rows is not the size this stack is built for. The target is the core pack of about 50,000 to 200,000 cards plus a few shards, which is what the table above measures.

## What this crate does not do

- It does not run inside an 80 ms heartbeat, and it does not open audio. Calling `query` is the host's job.
- It does not rank with a boosted tree, a cross-encoder, or a language model.
- It does not download a model, and it does not call an API model.
- It does not fetch a missing shard. The gap log names the shard. A person, or Galion Research, loads it.
- It does not delete a stored row or an old card version. `forget` and a card revision both archive.
- It has no persona filter, no time decay, and no CJK n-grams. Tokens are alphanumeric runs.

## Commands

```bash
horbm-memory [--db PATH] [--knowledge DIR] import CARD_DIR
horbm-memory [--db PATH] [--knowledge DIR] rebuild CARD_DIR
horbm-memory [--db PATH] [--knowledge DIR] query WORDS...
horbm-memory [--db PATH] [--knowledge DIR] gaps
horbm-memory [--db PATH] [--knowledge DIR] revisions --id ID
horbm-memory [--db PATH] [--knowledge DIR] card --id ID
horbm-memory [--db PATH] ingest DIR
horbm-memory [--db PATH] search WORDS...
horbm-memory [--db PATH] remember --text TEXT --said-by WHO --date DATE --source SRC
horbm-memory [--db PATH] diary add --text TEXT --date DATE [--said-by WHO] [--source SRC]
horbm-memory [--db PATH] diary list
horbm-memory [--db PATH] forget --id ID
horbm-memory [--db PATH] forget --mark --id ID
horbm-memory stack-bench [--n N] [--queries N] [--knowledge DIR]
```

The default database is `./horbm-memory.sqlite`. The default knowledge directory is `./horbm-knowledge`.

Library entry points are `Stack::open`, `import_dir`, `rebuild_dir`, `import_cards`, `apply_card`, `query`, `gap_queue`, `revisions`, `latest_card`, plus `Store` for the single-file diary.
