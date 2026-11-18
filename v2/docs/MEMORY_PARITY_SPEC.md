# HORBM memory parity with the Galion Research Rust stack

**Date:** 18 November 2026 (Europe/Zagreb, UTC+1)  
**Status:** implementation spec for one PR in `galion-knowledge` (`v2/memory`). Read-only research; this file is the only write.  
**Decision it implements:** remember option A (hybrid), and Mate’s rule that short-term and long-term memory must work like the Galion Research Rust memory stack.  
**Hard requirement:** memory must serve full-duplex realtime voice. Per-turn retrieval p95 ≤ 10 ms at 200,000 cards. Auto-extraction, importance scoring, session summaries, and revision writes run asynchronously after the turn, never on the voice path.

Code was read from clones in `/tmp` (never `/opt/galion/openmind`, never `/workspace/cargen`):

| Repo | Default branch | Commit | Commit time (Europe/Zagreb) |
|---|---|---|---|
| `galion-studio/obsidian-open-mind` | `main` | `466f7ed3861fdd47cf34fd740f940686ee0385d4` | 17 Nov 2026, 20:24 |
| `galion-studio/galion-knowledge` | `master` | `bc509ae642b4183f257fd33ba55567456ada1b46` | 18 Nov 2026, 23:10 |

Background design notes: `/workspace/horbm-remember-research.md` (18 Nov 2026). If a behaviour is not in the source cited below, this spec says so and does not invent it.

Call the product **Galion Research**, not Hermes. Crate names (`hermes-rs`, `hermes-gateway`) are kept when pointing at files.

---

## 1. How Galion Research short-term and long-term memory actually work

There are two Rust pieces, not one. `hermes-rs` / `hermes-gateway` hold the live conversation. `openmind-memory` is the long-term memory gateway rebuilt in Rust. A search of `crates/hermes-rs` and `crates/hermes-gateway` found **no** client for `/recall`, `/capture`, or `openmind-memory`. The old Python memory plugin did those calls; the Rust agent loop does not.

### 1.1 Short-term / working context (`hermes-rs`)

**What is kept.** Every session is a durable row plus an append-only message list. `SessionStore` (`crates/hermes-rs/src/session.rs` lines 73–86) is implemented by `MemStore` (tests), `JsonlStore` (pure Rust, phones / Pi), and `session_sqlite::SqliteStore` (feature `sqlite`, schema compatible with upstream `state.db` v30).

SQLite schema (`crates/hermes-rs/src/session_sqlite.rs` lines 18–52): tables `sessions` and `messages`. Session columns include `archived`, `pinned`, and `hidden`, all default 0. Message columns include `active` (default 1), `compacted` (default 0), and `_compressed_summary` (default 0). **`hermes-rs` does not write those flags.** It only *reads* `active = 1` when the column exists (lines 199–207). A test at lines 297 and 316 shows an `active = 0` row is skipped and described as “compacted away”. There is no compaction or summariser in this crate. `docs/ws-hermes.md` line 120 lists “context compression (it truncates instead)” among things the Rust port did not take from the Python agent.

**Eviction for the model prompt, not for storage.** History is not a 32-turn RAM ring. All stored messages stay on disk. Before each model call, `fit_context` (`crates/hermes-rs/src/agent.rs` lines 63–89) trims from the front so the system message plus the newest messages fit `context_length - reserve` (minimum budget 256). Token count is a rough `chars / 4 + 4` estimate (lines 57–61). It never starts the kept window on an orphaned `role=tool` message (lines 83–85). Default `context_length` is 65,536 (`crates/hermes-rs/src/config.rs` line 594). `reserve` is `max_tokens` or 4,096 (`agent.rs` line 105). `max_turns` (default 90, line 601) is the **tool-loop iteration cap** for one turn (`api.rs` line 370), not a session-length cap.

**What lives in RAM.** The current `Turn.messages` vector (`agent.rs` lines 25–32) plus whatever the session store has already written. `JsonlStore` and `SqliteStore` persist every append. `/api/sessions/{id}/messages` truncates *displayed* tool output to `history_tool_output_max_chars` (default 4,000; `api.rs` lines 548–561). That cap is not applied to the store itself.

**System prompt** is built from `SOUL.md`, optional channel files, config, and Persona Plex (`crates/hermes-rs/src/persona.rs`). It is not filled from `openmind-memory`.

### 1.2 Long-term memory (`openmind-memory`)

API-compatible replacement for the TencentDB tdai gateway the Python Galion Research plugin used. Schema and endpoints are in `crates/openmind-memory/src/store.rs` and `engine.rs`. Documented in `docs/ws-memory.md`.

**Storage.** SQLite (`vectors.db`, `PRAGMA user_version` 4) plus files under the data directory:

| Layer | What it is | Who writes it in the Rust crate |
|---|---|---|
| L0 | Raw turns: `l0_conversations` + FTS5 `l0_fts`, and daily `conversations/YYYY-MM-DD.jsonl` | `/capture` (`engine.rs` lines 326–452) |
| L1 | Extracted records: `l1_records` + `l1_fts`, column `priority INTEGER DEFAULT 50` (`store.rs` lines 16–21) | **Nobody in production.** `insert_l1` is a “Test/fixture helper” (`store.rs` lines 714–736). `/capture` returns `scheduler_notified: false` and comments “No L1/L2/L3 extraction pipeline in v0” (`engine.rs` lines 448–451). |
| L2 | Scene files and `.metadata/scene_index.json` | Read on recall; not produced by this crate |
| L3 | `persona.md` fact blocks tagged with `session:` | Read on recall; not produced by this crate |
| Offload | `offload/<session>/{refs,pending.jsonl,canvas.mmd,mmds/}` | `/v2/offload/ingest` writes refs, pending, and canvas. L1/L1.5 LLM summaries are **not ported** (`offload.rs` header, lines 5–6) |

L0 columns (`store.rs` lines 30–32): `record_id`, `session_key`, `session_id`, `role`, `message_text`, `recorded_at`, `timestamp`. There is **no** first-class `said_by`, `source`, `date`, `importance`, `pinned`, or revision chain.

**When L0 is written.** The host posts `/capture` with `user_content`, `assistant_content`, `session_key`. User and assistant messages are sanitised; assistant fenced code is stripped; framework noise and `/commands` are dropped (`text.rs` `should_capture_l0`, lines 312–313). A per-session timestamp cursor lives **in RAM** (cleared if the map exceeds 10,000 keys, `engine.rs` lines 424–427). It is not checkpointed. `/session/end` only checks `session_key` and returns `{"flushed":true}` — “no buffered pipeline work to flush in v0” (lines 668–673).

**Who decides.** Automatic capture of every qualifying turn, if the host calls `/capture`. The only explicit “save” in-tree is MCP tool `memory_save` (`crates/openmind-mcp-stack/src/lib.rs` lines 287–306), which posts the text to `/capture` as a user message in session `hermes-mcp-notes`. That is an L0 conversation row, not a pinned fact with provenance.

**Retrieval.** `POST /recall` (`engine.rs` lines 207–324): L1 FTS if the query is at least 2 UTF-16 units, score `r/(1+r)` from BM25 (`fts.rs` lines 161–171), keep score ≥ 0.3, max 5 (`config.rs` lines 73–78). By default those L1 lines are **computed and then dropped**, to match the old Node gateway; `OPENMIND_MEMORY_RECALL_INCLUDE_L1=1` opts in (lines 281–287). Context actually returned is session-filtered `persona.md` + scene navigation, plus an L0 fallback of at most 8 hits that contain the raw query verbatim, then cut to 2,000 UTF-16 units. `POST /search/memories` searches L1 only; `/search/conversations` searches L0. No int8 vectors (`embeddingService: false`). No recency decay. `priority` is printed, not used as a rank weight (`engine.rs` lines 600–607). No forget/archive API. The only `DELETE FROM l0_conversations` in the crate is inside a compatibility test (`store.rs` around line 1026). `ON CONFLICT DO UPDATE` on L0 record id can overwrite text (`store.rs` `upsert_l0`).

### 1.3 How Galion Research handles the voice path today

- The **Python** plugin (documented in `docs/memory-api.md` lines 42–54, not present in `hermes-rs`) called `/recall` **synchronously** in `prefetch()` before the prompt, then `/v2/offload/query-mmd`. `queue_prefetch` is a no-op. `sync_turn()` posted `/capture` on a **background thread, max 4 in flight**. That split — recall on the turn, capture after — is the only voice-aware scheduling in the written record.
- **`hermes-rs` / `hermes-gateway` do not call memory**, so they add no memory latency and also do not recall or persist long-term facts.
- **`openmind-memory` is a blocking HTTP handler** (one thread per connection, `crates/openmind-memory/src/http.rs`). SQLite `busy_timeout` is 5,000 ms (`store.rs` around lines 198 and 662). There is **no published p95** for `/recall` in the crate or its tests. Timeouts are 10 s / 30 s, not a 10 ms voice budget.
- Extraction and summaries were always an offline/LLM pipeline. The Rust port left them unimplemented, so they cannot block a turn — they also never run.

Do not put loopback HTTP to `openmind-memory` on HORBM’s voice path. That would add a network hop the current `Stack::query` does not have, and this repo has no measurement that it stays under 10 ms.

---

## 2. How HORBM memory works today

Crate `v2/memory` (`horbm-memory`). Design: `v2/docs/MEMORY_STACK.md`. Tests: `tests/stack.rs`, `tests/whole.rs`.

**Short-term.** `SessionRing` (`src/session.rs` lines 16–50) is a `VecDeque` of capacity `RING_CAP = 32` (`src/store.rs` lines 24–25). `push_turn` writes RAM only (`store.rs` lines 363–370). Pushing past 32 drops the oldest. `clear()` and process exit drop everything that was not later passed to `remember`. Comment at `session.rs` lines 6–7: it “dies with the process, unless the caller later passes the same words to `remember`.” Test `ring_is_ram_until_remember` (`tests/stack.rs` lines 74–109) proves a new process cannot search the turn until `remember`. Ring hits are token-overlap only (`store.rs` `ring_lexical_ids`, lines 984–1006), hydrated with `layer = "session"`, `source = "session-ring"`, `claim_type = "user-said"` (lines 1008–1018).

**Long-term.** One SQLite file (WAL, `synchronous=NORMAL`, `busy_timeout` 2,000 ms — `store.rs` lines 319–321). Layers on `items`: `semantic` (cards ingested into this file), `episode` (`remember`), `diary` (`diary_add`). Required fields on remember/diary: `text`, `said_by`, `date`, `source` (`require_fields`, lines 1366–1379). `remember` is “the only way a turn becomes durable” (lines 439–441). Diary is append-only; there is no edit path (line 477). `claim_type` for both is `user-said`.

**Retrieval.** Inside one pool: FTS5 BM25 (stopwords, DF cap 1/50 after 64 rows, max 8 rarest terms, `LIMIT 32`) fused with exact int8 hashing-vector scan and the RAM ring, RRF `1/(60+rank)`, at most 4 hits (`store.rs` lines 18–23, 589–624). Knowledge and memory stay in separate lists (`src/stack.rs` `query`, lines 254–309). No recency decay, no importance, no persona filter (`MEMORY_STACK.md` line 137). Query LRU is 128 entries, on the knowledge scale index (`src/scale.rs` line 59), not a memory-only cache.

**Revisions / forgetting.** Knowledge card changes append to `card_revisions` / `revisions.sqlite` (`reason = replaced` or `absent`). `forget --id` moves a live row to `archive` (`reason = forget`). `forget --mark` sets `marked = 1` and deletes the FTS row; the text stays in `items`. Nothing deletes archive or revision rows (`tests/stack.rs` lines 133–208). **There is no memory-fact revision when two episodes contradict.** A second `remember` just inserts another `ep-*` row.

**What is missing versus option A and versus Galion Research STM/LTM.** No persisted session transcript. No “keep whole session” switch or session summary. No automatic L0-style capture. No pinned flag. No candidate facts and no importance score. No recency in rank. No background queue. `Stack::query` **writes the gap log on a knowledge miss** (`stack.rs` lines 286–296) on the same call as retrieval.

**Latency already measured** (release, 18 Nov 2026, `MEMORY_STACK.md` lines 109–121; test `measured_corpus_at_the_target_size` in `tests/whole.rs` lines 276–377). Corpus: 200,000 generated cards (160,000 core, 40,000 in 4 shards). Clock: `Stack::query` after a cold LRU clear, 40 queries. Machine: Intel Xeon, 4 logical CPUs, AVX2.

| Query | p50 | p95 |
|---|---:|---:|
| Selective (`m{i}`) | 3,137 µs | 4,621 µs |
| Broad (`sample`) | 7,659 µs | 8,051 µs |

Both are under 10 ms. **The test records these numbers; it does not assert a budget.** `stack-bench` reports `target_p95_us: 5_000` and `p95_within_5ms` (`src/main.rs` lines 315 and 471) for `Store::search`, also as a report field, not a failing gate. `MEMORY_STACK.md` line 132: the crate “does not run inside an 80 ms heartbeat, and it does not open audio. Calling `query` is the host’s job.”

---

## 3. Feature comparison

| Feature | Galion Research Rust stack | HORBM `v2/memory` today | Same / different / missing |
|---|---|---|---|
| Short-term contents | Full session messages (user, assistant, tools) | Last 32 turns (text, said_by, date) | Different |
| Short-term persistence | JSONL or SQLite; survives restart | RAM only; dies with the process | Missing in HORBM |
| Short-term eviction | Prompt trim by token budget (`fit_context`); store keeps all; `active=0` respected but not written | Fixed ring of 32, drop oldest | Different |
| Working RAM | Current turn’s message vector + store cache | `SessionRing` (cap 32) | Different |
| Explicit “remember this” | MCP `memory_save` → L0 `/capture` (no pin, no provenance fields) | `Store::remember` → durable `episode` with source/date/said_by | Different (HORBM closer to a pin, but no `pinned` flag) |
| Automatic turn capture | `/capture` L0 when the host posts it; Rust agent does not | None (caller must `remember`) | Missing in HORBM |
| L1/fact extraction + importance | Schema `l1_records.priority` (default 50); **extractor not ported** | None | Missing in both Rust trees |
| Session summary / “keep whole session” | L2 scenes / offload `mmds/` in the old pipeline; **not produced** by the Rust crate. `/session/end` is a no-op flush | None | Missing in both Rust trees |
| Retrieval | FTS5 BM25; L0 exact-substring fallback; optional frozen persona/scenes; no vectors | FTS5 BM25 + int8 hashing vectors + ring, RRF, two pools | Different (HORBM stronger on the knowledge/memory query path) |
| Rank: recency | Not in the Rust crate | Not implemented (`MEMORY_STACK.md`) | Missing in both |
| Rank: importance / pin boost | `priority` displayed, not weighted | No importance field | Missing in both |
| Provenance (`source`, `date`, `said_by`) | L0 has `role`, `recorded_at`, `timestamp` only | Required on remember/diary; hits print `unknown` if empty | Different (HORBM already has the fields) |
| Contradiction / revision | L0 `ON CONFLICT` can overwrite; no revision API | Knowledge cards: append-only revisions. Memory episodes: no revision, only a new row. `forget` archives | Partial in HORBM (cards yes, memory facts no) |
| Forget / hide, never delete | No API | `mark` hides; `forget` archives; text kept | HORBM has it |
| Voice / async split | Documented only in the old Python plugin (recall sync, capture background). Rust gateway is blocking HTTP. No 10 ms gate | `query` already < 10 ms p95 at 200k, but can write `gaps` on the same call; no background queue | Partial in HORBM |
| HTTP memory gateway | `openmind-memory` on loopback | Library + CLI, no HTTP | Different (keep HORBM in-process on the voice path) |

---

## 4. Target design (option A, on the HORBM engine, shaped like Galion Research)

Keep HORBM’s in-process FTS5 + int8 + RRF engine and provenance rules. Shape the session and fact layers like Galion Research: persist the transcript (L0), keep a working window for the current call, and store long-term facts separately (L1-like), with pins as first-class.

### 4.1 Short-term (voice working memory)

1. **RAM ring stays** (cap 32) as the current-call working set, searchable immediately via `ring_lexical_ids`.
2. **Every `push_turn` also enqueues a transcript append** (Galion Research L0 / `SessionStore.append`). The transcript is append-only: `session_id`, turn id, `said_by`, `text`, `date`, `source` (default `session-ring` until recalled as a fact), timestamp. It survives restart. Ring eviction must not erase the transcript.
3. **Do not wait for the append on the voice path.** `push_turn` updates the ring and returns. A background worker writes SQLite/FTS.
4. A later host that builds a model prompt may trim a loaded transcript with the same rules as `fit_context` (keep the newest messages under a token budget, never start on an orphaned tool result). That helper can be ported as a pure function. HORBM itself still does not call a model.

### 4.2 Long-term (option A hybrid)

1. **Pinned facts.** `remember` (CLI and `Store::remember`) writes a durable fact with `source`, `date`, `said_by`, and `pinned = 1`. Highest retrieval weight. Never silently dropped or overwritten.
2. **Candidate facts.** After a turn is persisted, a background job may extract candidates (preferences, identity, decisions, relationships, plans). Each gets an `importance` in `[0, 1]`, `said_by`, `date`, `source`, and `extractor = system`. Lower weight than pins. Marked as system-extracted, not gospel.
3. **Optional “keep this whole session” switch.** When on: (a) a short session summary written by a background job, (b) the full transcript remains searchable in the archive. When off: still extract high-importance candidates; do not promote the whole session into the live profile. Default off.
4. **Retrieval (memory pool only).** Existing BM25 + int8 + ring, fused with RRF. Then a cheap rerank on the short list (≤ `POOL` = 32): `score' = RRF × recency × importance_weight × pin_boost`. Recency is exponential decay on the fact’s event date (and last-access if stored). Pins get a fixed boost (see §6). Knowledge pool is unchanged: no recency/importance, still a separate list, still “I don’t know” on a card miss.
5. **Contradiction = revision, never overwrite or delete.** A new fact that conflicts with a current one inserts a new current row, archives the old one (`reason = revised`), and keeps the old `source`/`date`/`said_by`. User correction is the same path. `mark` remains “hide from retrieval, keep the row.” `forget` remains “move to `archive`.”
6. **Every fact keeps `source`, `date`, `said_by`.** Empty display values stay the literal `unknown`.
7. **What not to auto-promote.** Jokes, one-off task detail, credentials, low-importance chit-chat stay in the transcript only, unless pinned. The extractor must not write secrets.

### 4.3 Voice path (hard)

| Work | Where it runs |
|---|---|
| `push_turn` (ring + enqueue) | Hot |
| `query` / `search_memory` (FTS + int8 + ring + rerank, no durable write) | Hot |
| Transcript persist, gap log, `remember` disk commit if it would stall, auto-extraction, importance scoring, session summary, contradiction revision, FTS/arena rebuilds that are more than a single-row insert | Background queue only |

`Stack::query` must **stop writing `gaps` inline**. Enqueue the gap row. A miss still returns `I don't know` immediately.

User-visible `remember` may update the ring (or an in-memory pin list) so the same call can retrieve the fact, but the SQLite commit is on the queue if a synchronous insert+`reload_arena` cannot be shown to stay inside the budget. Knowledge index rebuilds must never run from a memory write.

---

## 5. What to reuse vs what to add

Rust first. Do not reinvent the retrieval engine. Do not call `openmind-memory` over HTTP from the voice path. Do not vendor the Node/Python pipeline. This crate stays local and does not call an API model (`MEMORY_STACK.md` lines 133–134; standing CPU-only rule).

**Reuse in place (HORBM):** `SessionRing`, `Store::remember` / `diary_add` / `mark` / `forget` / `archive`, FTS5 + int8 + RRF, two-pool `Stack::query`, provenance on hits, `tests/whole.rs` measurement harness, WAL.

**Reuse by porting small pure functions from Galion Research (MIT, same org), not the HTTP server:**

- `fit_context` / `estimate_tokens` (`hermes-rs` `agent.rs` lines 57–89) as an optional transcript-window helper.
- The idea of append-only session messages + a later prompt trim, from `SessionStore`.
- The L0/L1 split: transcript vs scored facts. HORBM already has richer fact fields; do not copy the L0 schema (it lacks provenance).
- `priority` as the ancestor of `importance` (L1 column). Do not copy `insert_l1` as the write path for pins.
- The scheduling idea from the old plugin: recall on the turn, capture/extract after. Implement it as an in-process queue, not HTTP.

**Do not port into this PR:** `openmind-memory` HTTP/auth, persona.md / scene navigation, jieba/CJK n-grams, offload mermaid canvas, LLM L1/L2/L3 pipeline, loopback gateway, embeddings service.

**Add in `v2/memory` (suggested files, one crate, one PR):**

| Piece | Suggested location |
|---|---|
| Schema v5: `session_turns`, `session_meta` (`keep_whole`, summary pointer), fact flags on memory rows (`pinned`, `importance`, `kind`, `session_id`, `current`, `extractor`), `memory_jobs` queue, `memory_revisions` (or extend `archive` with `reason = revised`) | `src/store.rs` migration, additive, old DBs open |
| Background worker (`std::thread` + channel or `memory_jobs` table). Kinds: `persist_turn`, `log_gap`, `extract`, `summarise`, `revise`, `commit_pin` | `src/queue.rs` |
| `FactExtractor` trait + a deterministic built-in (explicit “remember this” / clear first-person identity or preference lines → candidates with a documented heuristic score). No model call | `src/extract.rs` |
| Recency + importance + pin rerank on the memory short list | `src/rank.rs` or a private fn in `store.rs` |
| `keep_whole_session(session_id, bool)`, `session_summary`, transcript search when keep-whole is on | `src/store.rs` / CLI in `src/main.rs` |
| `fit_context`-style window helper (optional, unit-tested) | `src/session.rs` |
| Latency gate | `tests/whole.rs` |
| Behaviour tests | `tests/stack.rs` |

Default `importance`: pins = 1.0; candidates = extractor score; diary/episode without a score = 0.5. Pin boost on the short list: multiply by 2.0 (constant documented in code). Recency: `exp(-λ * age_days)` with `λ = ln(2) / 30` (half-life 30 days), applied only to the memory pool. If this changes ranking tests, update them with fixed dates.

Extractor contradiction detection in this PR may be conservative (same subject key + conflicting object, or an explicit `revise_fact(old_id, new_text, …)` API). Do not invent an LLM judge. If the extractor is unsure, leave both as current candidates rather than guessing; the revise API and “this is wrong” path must still archive, not delete.

---

## 6. Latency budget (200,000 cards, release, cold LRU)

Measured baseline is `Stack::query` on 2026-11-18: selective p95 4,621 µs, broad p95 8,051 µs. Headroom to 10 ms is small on broad queries (~1.9 ms). New rerank must be O(short list). New writes must not take the query lock.

| Step | Budget (p95) | On the voice path? | Notes |
|---|---:|---|---|
| `push_turn` (ring update + enqueue) | ≤ 1 ms | Yes | No `reload_arena`, no FTS write, no wait on the worker |
| `Stack::query` / `search_memory` including recency × importance rerank | ≤ 10 ms | Yes | Hard gate. Both selective and broad, 40 cold queries, same corpus shape as today (160k core + 4 shards) |
| Knowledge / memory split, “I don’t know” | inside the 10 ms | Yes | Gap **enqueue** only; no `INSERT INTO gaps` in this call |
| Transcript persist (L0-like append) | unbudgeted | No | Worker; WAL. Must not hold a lock that makes query busy-wait |
| Pin commit, extraction, importance, summary, revision, arena reload | unbudgeted | No | Same queue |
| Galion Research / LLM / any API model | never | No | Not in this crate |

SQLite: keep WAL. The query connection should use a **short** `busy_timeout` (suggest 5 ms, not 2,000 ms) or a read-only connection, so a writer cannot stall a turn. If the lock is busy, return ring + whatever the reader can see without waiting, rather than block toward 10 ms. The worker uses a separate connection. Do not rebuild the 200k knowledge index from a memory job.

---

## 7. Tests to write

All in `v2/memory`. Debug tests stay small and must not assert the 10 ms budget (same pattern as `measured_corpus_at_the_target_size`, `tests/whole.rs` lines 277–278).

**Behaviour (`tests/stack.rs` or a new `tests/memory_a.rs`):**

1. Ring still drops the 33rd turn; the dropped turn is still in `session_turns` after the worker drains.
2. Restart / reopen: a turn that was only `push_turn`’d is searchable in the transcript once the worker has written it; it is not required to be in the ring.
3. `remember` creates a pinned fact with `source`, `date`, `said_by`; it ranks above a candidate with the same text.
4. `remember` still rejects empty fields (`tests/stack.rs` lines 230–234).
5. Built-in extractor, run only via the queue: a “remember this: …” / first-person preference line becomes a candidate with `importance > 0` and `extractor = system`; a joke/low-signal line does not.
6. `keep_whole_session(true)` stores a summary (deterministic stub is enough) and leaves the transcript searchable; `false` does not promote the whole session into the live profile.
7. Contradiction / `revise_fact`: old row is in archive or `memory_revisions` with its original provenance, `reason = revised`; search returns only the new current fact; no `DELETE` of the old text.
8. `mark` and `forget` still hide from retrieval and keep text (`tests/stack.rs` lines 133–208).
9. Query still returns at most four hits, two pools, provenance on every hit, `I don't know` on a knowledge miss.
10. `query` does not insert into `gaps` before returning; after `drain()` (test helper) the gap row exists.
11. `push_turn` / `query` do not block on a stuck worker: with the worker paused, both return within the test’s short timeout; the queue length grows.

**Latency gate (`tests/whole.rs`, release only):**

12. Keep `measured_corpus_at_the_target_size` and **assert** `selective_p95_us <= 10_000` and `broad_p95_us <= 10_000` when `n == 200_000`.
13. New `voice_hot_path_holds_under_background_writes`: same 200k index; a worker thread continuously enqueues persist/extract/summary/revise jobs; 40 cold `query` calls still have p95 ≤ 10,000 µs. Fail if a query takes the 2 s busy timeout.

Do not assert the 5 ms `stack-bench` flag. That is tighter than the voice ceiling and is already exceeded by today’s broad `Stack::query` p95 (8.1 ms).

---

## 8. Acceptance criteria

The PR lands only if all of the following are true:

1. `cargo test` (debug) and `cargo test --release --test whole` pass, including the 10 ms asserts at 200k.
2. Pins, candidates, keep-whole summaries, revisions, mark/forget, and provenance behave as in §7.
3. No extraction, summary, revision, gap insert, or transcript flush runs inside `query` / `push_turn`.
4. No new HTTP client to `openmind-memory` on the query path. No API model. No deletion of stored text.
5. `v2/docs/MEMORY_STACK.md` is updated: ring + persisted transcript, option A, voice budget, and the new measured p95 figures from the release test (not copied from this document if the run differs).
6. Schema migration is additive (`user_version` 5). An old memory DB opens, and previously remembered episodes remain searchable.
7. CLI: existing commands keep working; add `keep-session`, a jobs/drain helper for tests/ops, and show `pinned` / `importance` on memory hits. No secrets in logs or commits.

Out of scope for this PR: wiring Galion Research’s live agent to HORBM; porting L2/L3 persona files; a learned or LLM extractor; changing the knowledge pack or truth gate; deploy or merge to a live voice service (those need Mate’s own yes).

---

## 9. What this research did not find

- No code in `hermes-rs` / `hermes-gateway` that recalls, captures, pins, or scores memories.
- No Rust L1/L2/L3 extractor or session summariser in `openmind-memory`.
- No recency or importance ranker in either tree.
- No 10 ms (or any) p95 gate on Galion Research `/recall`.
- No HORBM API for “keep this whole session” or memory-fact revisions.
- Whether a later unpublished branch already started this work was not checked beyond the two default-branch commits in the table above.
