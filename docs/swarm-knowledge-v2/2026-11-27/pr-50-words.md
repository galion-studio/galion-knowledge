# PR #50 — F1 first words (S208)

- PR: https://github.com/galion-studio/galion-knowledge/pull/50
- Branch: `cursor/f1-first-words-682f`
- Prior head: `cdd13ded34d5e339bedd9464eae7ae59866a66ca`
- Master merge: `6d829b516230a129b94ca83e28624d54b9f670e8`, which brought in `origin/master` `4618689fdfe020c6aaaf346cae9d4253e0955c65` (PR #49, publication 11).
- Head SHA: this publication commit (`Publish core-pack digest 12 after F1 first-words cards.`). The swarm report lists `git rev-parse HEAD` after the push, because a commit cannot contain its own hash.
- Publication: 12
- sha256: `563ba7d962c093fb6ef37af8c2adae635bc68bf487adffa2dcfd465ce7c01305`
- bytes: 3654648
- cards: 1839 (1,786 after publication 11 plus 53 `world/world-f1-words-*` files)
- Written: 2026-11-27 15:23:11 +0100 (Europe/Zagreb)

## Tests

- Ran: `cargo test --locked --manifest-path v2/memory/Cargo.toml addon_shard_manifest_matches_shard_manifest` — passed (`addon_shard_manifest_matches_shard_manifest ... ok`).
- Not run: Playwright, the static site build, and the rest of the V2 truth-gate workflow. Those run in GitHub check `gate`.
- Truth-gate report files were not regenerated or committed.

## CI and merge

- CI: GitHub check `gate` (workflow "V2 truth gate") on this commit. The run link is recorded in the swarm report after the push.
- Laptop gate: merge waits for a `galion-studio` comment `Laptop gate PASS <head sha>` in addition to a green GitHub `gate`. Not received at the time of this note.
- Merge SHA: not merged at the time of this note. Merge is `gh pr merge 50 --merge` only after both gates pass. No rebase, no force-push, no admin merge.

## Refused

- No card edits. No other PRs. No S230 principles work. No new cards. Did not start while PR #49 was open.
