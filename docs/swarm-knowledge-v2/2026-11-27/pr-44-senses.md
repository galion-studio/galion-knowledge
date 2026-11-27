# PR #44 — F1 senses (S202)

- PR: https://github.com/galion-studio/galion-knowledge/pull/44
- Branch: `cursor/f1-senses-cards-6a09`
- Prior head (before this publication commit): `4bd257e60ae1cc9d05599e23ee67b4e8be49af67`
- Digest commit: `99ee85ba826fc179fd9aaa1b0c2aa78fcb80ee68` (`Publish core-pack digest 7 after F1 senses cards.`).
- Head SHA: the commit that adds this digest SHA to the note (child of `99ee85ba826fc179fd9aaa1b0c2aa78fcb80ee68`). The swarm report lists `git rev-parse HEAD` after that commit.
- Base at publication: `origin/master` `9fdbb2477b81bdc3ae9feccff8bf9a01dc68875f` (already an ancestor; merge was already up to date).
- Publication: 7
- sha256: `200ab66f323fb90d0b46e4938a708aa61f327bc0bc0a3a1c85877c8a4ad85968`
- bytes: 3198459
- cards: 1573 (1,523 on master plus 50 `world/world-f1-senses-*` files)
- Written: 2026-11-27 12:44:17 +0100 (Europe/Zagreb)

## Tests

- Ran: `cargo test --locked --manifest-path v2/memory/Cargo.toml addon_shard_manifest_matches_shard_manifest` — passed (`addon_shard_manifest_matches_shard_manifest ... ok`).
- Not run: Playwright, the static site build, and the rest of the V2 truth-gate workflow. Those run in GitHub check `gate`.
- Truth-gate report files were not regenerated or committed.

## CI and merge

- CI: GitHub check `gate` (workflow "V2 truth gate") on this commit. The run link is recorded in the swarm report after the push.
- Merge SHA: not merged at the time of this note. Merge is `gh pr merge 44 --merge` only after `gate` is success. No rebase, no force-push, no admin merge.

## Refused

- No card edits. No other PRs. No S230 principles work. No new cards.
