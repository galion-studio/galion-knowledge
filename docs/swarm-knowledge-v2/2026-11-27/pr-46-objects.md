# PR #46 — F1 objects (S203)

- PR: https://github.com/galion-studio/galion-knowledge/pull/46
- Branch: `cursor/f1-objects-cards-5ab2`
- Prior head: `301b49204a2e22b22f1d593cebf5b6468dea657a`
- Master merge: `e33ac79e3cd28572fa6498320206a9e9739c42b8`, which brought in `origin/master` `4adcdd013b6f8d62bec2a05491cc794048abaee2` (PR #44, publication 7).
- Head SHA: this publication commit (`Publish core-pack digest 8 after F1 objects cards.`). The swarm report lists `git rev-parse HEAD` after the push, because a commit cannot contain its own hash.
- Publication: 8
- sha256: `7d1205e0b4d118f81a9d36d3fab83b39d9284b707171847a79e297232ef8b406`
- bytes: 3311419
- cards: 1637 (1,573 after publication 7 plus 64 `world/world-f1-objects-*` files)
- Written: 2026-11-27 12:51:22 +0100 (Europe/Zagreb)

## Tests

- Ran: `cargo test --locked --manifest-path v2/memory/Cargo.toml addon_shard_manifest_matches_shard_manifest` — passed (`addon_shard_manifest_matches_shard_manifest ... ok`).
- Not run: Playwright, the static site build, and the rest of the V2 truth-gate workflow. Those run in GitHub check `gate`.
- Truth-gate report files were not regenerated or committed.

## CI and merge

- CI: GitHub check `gate` (workflow "V2 truth gate") on this commit. The run link is recorded in the swarm report after the push.
- Merge SHA: not merged at the time of this note. Merge is `gh pr merge 46 --merge` only after `gate` is success. No rebase, no force-push, no admin merge.

## Refused

- No card edits. No other PRs. No S230 principles work. No new cards. Did not start while PR #44 was open.
