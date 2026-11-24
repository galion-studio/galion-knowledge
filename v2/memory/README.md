# horbm-memory

HORBM's memory and the Galion knowledge cards, in one library and one CLI.

What the user told us (the RAM ring, a remembered episode, the diary) stays in `memory`. World cards stay in `knowledge`. A query returns at most four hits, split across those two lists. A miss on the cards is the answer `I don't know`.

```bash
cargo test
cargo run --release -- --knowledge /tmp/horbm-knowledge import ../data/cards
cargo run --release -- --knowledge /tmp/horbm-knowledge query "compatibilist"
cargo run --release -- --db /tmp/horbm.sqlite search "bm25"
```

Design and measured latency: [`../docs/MEMORY_STACK.md`](../docs/MEMORY_STACK.md).

A git dependency cannot point at this subdirectory. The `Cargo.toml` at the repository root is the same library (`lib` path `v2/memory/src/lib.rs`) so another crate can depend on `horbm-memory` by git revision. `cd v2/memory` is still how this crate is tested. `Store::search` fuses FTS5 with the int8 arena. `Store::search_lexical` is the FTS5 leg alone.

MIT License. Copyright (c) 2026 Galion Labs.
