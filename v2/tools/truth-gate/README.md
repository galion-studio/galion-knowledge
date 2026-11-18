# truth-gate

Checks a Galion Knowledge card before it is published.

A hard failure exits 1. Warnings stay in the report and do not rewrite the card. The default run does not open a network connection. `--check-urls` requests each source URL and records a warning when the response is not a success. A refused connection is a warning, not a verdict that the source is false.

Wikipedia, its mirrors, and derivatives that republish it are banned in `truth-gate.toml`. Wikisource is not on that list. It is classified as a transcription of a primary text. The Stanford Encyclopedia of Philosophy is classified as a refereed source. A house document on GitHub supports `weak`, which is the evidence scale's word for a house rule.

```bash
cargo test
cargo run -- --cards ../../data/cards --shards ../../shards \
  --schema ../../data/schema.json \
  --catalog ../../data/catalog.json --config truth-gate.toml
```

Rust 1.85 or newer. The crate directory pins the stable toolchain.

The publication rules and the latest counts are in [`../../docs/TRUTH_GATE.md`](../../docs/TRUTH_GATE.md). How a card is challenged is in [`../../docs/REVIEW_POLICY.md`](../../docs/REVIEW_POLICY.md).

MIT License. Copyright (c) 2026 Galion Labs.
