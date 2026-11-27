# PR #48 — F1 body parts (S201)

- PR: https://github.com/galion-studio/galion-knowledge/pull/48
- Branch: `cursor/f1-body-parts-02bd`
- Prior head: `3f5b2c7d6564ac0e7141422fe5014f5319cac559`
- Master merge: `2def0368098de93ccb37ceeaced6902093cc2f3c`, which brought in `origin/master` `af38abb75390a2af03e1ef91ef37f12455657da2` (PR #47, publication 9).
- Head SHA: this publication commit (`Publish core-pack digest 10 after F1 body cards.`). The swarm report lists `git rev-parse HEAD` after the push, because a commit cannot contain its own hash.
- Publication: 10
- sha256: `fb166204e7548c9b010dae0be42bf7f661949ed9469ed2d79871c6e7e5538561`
- bytes: 3470975
- cards: 1734 (1,686 after publication 9 plus 48 `world/world-f1-body-*` files)
- Written: 2026-11-27 13:05:48 +0100 (Europe/Zagreb)

## Tests

- Ran: `cargo test --locked --manifest-path v2/memory/Cargo.toml addon_shard_manifest_matches_shard_manifest` — passed (`addon_shard_manifest_matches_shard_manifest ... ok`).
- Not run: Playwright, the static site build, and the rest of the V2 truth-gate workflow. Those run in GitHub check `gate`.
- Truth-gate report files were not regenerated or committed.

## CI and merge

- CI: GitHub check `gate` (workflow "V2 truth gate") on this commit. The run link is recorded in the swarm report after the push.
- Merge SHA: not merged at the time of this note. Merge is `gh pr merge 48 --merge` only after `gate` is success. No rebase, no force-push, no admin merge.

## Refused

- No card edits. No other PRs. No S230 principles work. No new cards. Did not start while PR #47 was open.
