# Galion Research gap-fill runner (snapshot from Titan)

Live copy runs on Titan at /usr/local/lib/galion-gapfill/gapfill.py; state in /var/lib/galion-gapfill/.
Calls the Galion Research gateway (hermes-rs, loopback :8642) with River models
(deepseek-ai/DeepSeek-V4.1-Flash-1017, zai-org/GLM-5.3-Flash). Shared budget ledger cap $25 (stop at $24).
samples/runs-math-test2.out is the latest test log: many topics fail with `no_json`.
