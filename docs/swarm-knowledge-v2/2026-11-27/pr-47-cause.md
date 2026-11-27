# PR #47 — F1 cause and object permanence (S204)

- PR: https://github.com/galion-studio/galion-knowledge/pull/47
- Branch: `cursor/f1-cause-object-permanence-8bac`
- Prior head: `167a600e2768721f2b8333ff4e9fba7aeca5bc6e`
- Master merge: `a9115cdee7928f0322921225a58eb64dd060beb2`, which brought in `origin/master` `135b9cf81bff077aca31952652244ece2a933dae` (PR #46, publication 8).
- Head SHA: this publication commit (`Publish core-pack digest 9 after F1 cause cards.`). The swarm report lists `git rev-parse HEAD` after the push, because a commit cannot contain its own hash.
- Publication: 9
- sha256: `9adad02b323224f6a7118709b9734b60843b506ee12f31fc4ba04d2fc0277422`
- bytes: 3394985
- cards: 1686 (1,637 after publication 8 plus 49 `world/world-f1-cause-*` files)
- Written: 2026-11-27 12:57:16 +0100 (Europe/Zagreb)

## Tests

- Ran: `cargo test --locked --manifest-path v2/memory/Cargo.toml addon_shard_manifest_matches_shard_manifest` — passed (`addon_shard_manifest_matches_shard_manifest ... ok`).
- Not run: Playwright, the static site build, and the rest of the V2 truth-gate workflow. Those run in GitHub check `gate`.
- Truth-gate report files were not regenerated or committed.

## CI and merge

- CI: GitHub check `gate` (workflow "V2 truth gate") on this commit. The run link is recorded in the swarm report after the push.
- Merge SHA: not merged at the time of this note. Merge is `gh pr merge 47 --merge` only after `gate` is success. No rebase, no force-push, no admin merge.

## Refused

- No card edits. No other PRs. No S230 principles work. No new cards. Did not start while PR #46 was open.
