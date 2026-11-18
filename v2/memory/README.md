# horbm-memory

HORBM's diary and memory stack. Library and `horbm-memory` CLI.

SQLite FTS5 (BM25) plus one int8 vector per row, exact scan, fused with reciprocal rank fusion. Search returns at most four hits. Each hit keeps `said_by`, `date`, and `source`.

```bash
cargo test
cargo run --release -- --db /tmp/horbm.sqlite ingest fixtures
cargo run --release -- --db /tmp/horbm.sqlite search "bm25"
cargo run --release -- --db /tmp/horbm.sqlite bench --n 2000
```

Design, measured latency, and open questions: [`../docs/MEMORY_STACK.md`](../docs/MEMORY_STACK.md).

MIT License. Copyright (c) 2026 Galion Labs.
