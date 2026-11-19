# Galion Research gap-fill

`gapfill.py` is the single-run card writer. `swarm.py` runs it across a queue of
topics with several workers, one shared budget, and resume. The live copy of
the writer is on Titan at `/usr/local/lib/galion-gapfill/gapfill.py`; state is
in `/var/lib/galion-gapfill/`. Both talk to the Galion Research gateway
(hermes-rs, loopback `:8642`) with River models (`deepseek-ai/DeepSeek-V4.1-Flash-1017`,
`zai-org/GLM-5.3-Flash`).

The gateway config has `max_concurrent_runs: 3` and that value is locked.
The swarm default is **2 workers**, so one run slot stays free for the owner's
chats. `--workers` may be 16 or more; extras wait on the queue instead of
erroring. A call cut off by a gateway restart (connection drop, HTTP 502, 503,
or 504) is retried once and is not counted as a failure. HTTP 429 and other
5xx responses back off and retry.

The shared ledger is `/var/lib/galion-gapfill/budget.json` (fcntl lock), cap
**$25**, stop reserving at **$24**. The gateway's own caps are also honored:
**$5** per session, **$21.50** per Zagreb day, **2000** calls per Zagreb day.

`samples/runs-math-test2.out` is an earlier single-run log. Many of those
topics failed with `no_json`; the writer now retries a missing card JSON once
in the same session.

## Topics

Put one JSON object per line in `tools/gapfill/topics/*.jsonl` (UTF-8, any
language). A line looks like:

```json
{"cid": "world.core.math.wiles-fermat-1995", "topic": "Andrew Wiles's 1995 Annals paper proving Fermat's Last Theorem", "category": "mathematics", "area": "math"}
```

A directory or a single file both work (`--topics`). `samples/topics-math.jsonl`
is a 20-topic math batch.

## Run the swarm

From the repo (the API key is read from the gateway env on Titan):

```bash
python3 tools/gapfill/swarm.py \
  --topics tools/gapfill/topics \
  --run core-2026
```

That resumes if you restart it. Per-topic state is
`/var/lib/galion-gapfill/runs/<run>/state/<cid>.json`. Topics already kept,
dropped, skipped, or failed are not run again. A topic left `running` by a
crash is retried. Delete that state file to force one topic back onto the queue.

Live progress (one line per finished topic):

```text
progress done=12 kept=9 dropped=2 failed=1 skipped=0 spent=$0.4821 restarts=0 topic=world.core.math.foo result=dropped
```

Useful knobs:

```bash
python3 tools/gapfill/swarm.py --topics tools/gapfill/topics --run core-2026 \
  --workers 16 \
  --gateway-concurrency 3 \
  --owner-slots 1 \
  --cap 25 --stop-at 24 --reserve 0.30 \
  --session-cap 5 --daily-cap 21.50 --max-calls 2000
```

`--workers 16` still keeps only `gateway-concurrency - owner-slots` calls in
flight (2 with the defaults). The rest of the workers queue.

## Test batch before scaling

`--test 20` runs at most 20 pending topics, then prints a pass/fail summary.
Exit status is non-zero if any card fails the truth gate (`verify_card` or the
fact-check reviewer drops it), if the gateway returns no card, or if the batch
stops early (budget, daily cap, or the call cap). A restart that recovers is
not a failure.

```bash
python3 tools/gapfill/swarm.py \
  --topics tools/gapfill/samples/topics-math.jsonl \
  --run math-test \
  --test 20
```

```text
=== test batch ===
PASS  world.core.math.wiles-fermat-1995  truth gate passed
FAIL  world.core.math.example  truth gate: quote not found on any opened source
progress done=20 kept=18 dropped=2 failed=0 spent=$1.2345 restarts=0
result: FAIL (truth gate)
```

Scale up only after a batch prints `result: PASS`.

## Offline tests

No gateway and no network. A small `http.server` stands in for `:8642` and
covers concurrency, the budget cap, and resume:

```bash
python3 tools/gapfill/test_swarm.py
```
