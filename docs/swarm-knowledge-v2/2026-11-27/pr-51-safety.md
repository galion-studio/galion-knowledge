# PR #51 — F1 safety, sleep, and home (S210)

- PR: https://github.com/galion-studio/galion-knowledge/pull/51
- Branch: `cursor/f1-safety-sleep-home-ea13`
- Prior head: `52305bf85c5e3d34c1e0fe51a6f99ba1b20a0964`
- Master merge: `66f7beeec8265f7300f7650d3a6b0edd0a96ad10`, which brought in `origin/master` `222204056af7ba9816a7685e1c451a857cc81474` (PR #50, publication 12).
- Head SHA: this publication commit (`Publish core-pack digest 13 after F1 safety and sleep cards.`). The swarm report lists `git rev-parse HEAD` after the push, because a commit cannot contain its own hash.
- Publication: 13
- sha256: `07734b3c3e49862d2613ba3460ccc3a453a0b4e09acd72d3c54e83fe4c6071d1`
- bytes: 3750838
- cards: 1893 (1,839 after publication 12 plus 54 `world/world-f1-safety-*` files)
- Written: 2026-11-27 15:29:45 +0100 (Europe/Zagreb)

## Tests

- Ran: `cargo test --locked --manifest-path v2/memory/Cargo.toml addon_shard_manifest_matches_shard_manifest` — passed (`addon_shard_manifest_matches_shard_manifest ... ok`).
- Not run: Playwright, the static site build, and the rest of the V2 truth-gate workflow. Those run in GitHub check `gate`.
- Truth-gate report files were not regenerated or committed.

## CI and merge

- CI: GitHub check `gate` (workflow "V2 truth gate") on this commit. The run link is recorded in the swarm report after the push.
- Laptop gate: merge waits for a `galion-studio` comment `Laptop gate PASS <head sha>` in addition to a green GitHub `gate`. Not received at the time of this note.
- Merge SHA: not merged at the time of this note. Merge is `gh pr merge 51 --merge` only after both gates pass. No rebase, no force-push, no admin merge.

## Refused

- No card edits. No other PRs. No S230 principles work. No new cards. Did not start while PR #50 was open.
