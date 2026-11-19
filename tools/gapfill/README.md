# Galion Research gap-fill runner (snapshot from Titan)

Live copy runs on Titan at `/usr/local/lib/galion-gapfill/gapfill.py`; state in `/var/lib/galion-gapfill/`.
Calls the Galion Research gateway (hermes-rs, loopback :8642) with River models
(`deepseek-ai/DeepSeek-V4.1-Flash-1017`, `zai-org/GLM-5.3-Flash`).

The gateway allows 3 concurrent runs (`--max-concurrent`, default 3). Extra workers wait.
Shared budget ledger cap $25 (stop at $24). Each call stops at `--card-cap` (default $0.08)
and `--max-tokens` (default 4096). Each topic stops at `--topic-cap` (default $0.10) across
the author call, the one JSON retry, reviews, and revisions. Pass `--topic-cap 0.05` for a
tighter cap. Every call, including the JSON retry, is one ledger line. The cost is the
gateway spend-file delta for that session, or the usage cost when the spend file has not
moved yet. A later spend-file update does not count that usage again.

The final message has to be one JSON object. The runner sends a JSON-only system prompt
and `response_format: json_object` when the gateway accepts it. If the gateway rejects
that field or `max_tokens`, the call is retried once without it. Replies may be fenced,
wrapped in prose, or wrapped in a think block. The first object that matches
`v2/data/schema.json` is the card. One format retry includes the parse error; then the
topic is failed. Wikipedia and Wikipedia-derived hosts are rejected. `verify_card` still
checks every source before a card is kept.

Offline tests (no gateway):

```bash
python3 tools/gapfill/test_gapfill.py
```

`samples/runs-math-test2.out` is a log from before this retry: 4 of 20 topics failed
with `no_json`, and one of those calls cost $0.22.
