# PR #49 — F1 everyday physics (S205)

- PR: https://github.com/galion-studio/galion-knowledge/pull/49
- Branch: `cursor/f1-everyday-physics-18fd`
- Prior head: `bf0bf0336bbe519822ab1edec40e01a6d2da75cf`
- Master merge: `1fb988c300e7d81018456bf6fa373577bf919882`, which brought in `origin/master` `5d4c47f36481fba4b1db949370acf95b273888dc` (PR #48, publication 10).
- Head SHA: this publication commit (`Publish core-pack digest 11 after F1 everyday physics cards.`). The swarm report lists `git rev-parse HEAD` after the push, because a commit cannot contain its own hash.
- Publication: 11
- sha256: `35d61a9c96e0113fcc5b2652936bc3660a6d51f7f664e6ef88501eec979f7ff4`
- bytes: 3558762
- cards: 1786 (1,734 after publication 10 plus 52 `world/world-f1-physics-*` files)
- Written: 2026-11-27 15:16:41 +0100 (Europe/Zagreb)

## Tests

- Ran: `cargo test --locked --manifest-path v2/memory/Cargo.toml addon_shard_manifest_matches_shard_manifest` — passed (`addon_shard_manifest_matches_shard_manifest ... ok`).
- Not run: Playwright, the static site build, and the rest of the V2 truth-gate workflow. Those run in GitHub check `gate`.
- Truth-gate report files were not regenerated or committed.

## CI and merge

- CI: GitHub check `gate` (workflow "V2 truth gate") on this commit. The run link is recorded in the swarm report after the push.
- Laptop gate: merge waits for a `galion-studio` comment `Laptop gate PASS <head sha>` in addition to a green GitHub `gate`. Not received at the time of this note.
- Merge SHA: not merged at the time of this note. Merge is `gh pr merge 49 --merge` only after both gates pass. No rebase, no force-push, no admin merge.

## Refused

- No card edits. No other PRs. No S230 principles work. No new cards. Did not start while PR #48 was open.
