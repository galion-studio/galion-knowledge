# PR #52 — F1 social cues (S207)

- PR: https://github.com/galion-studio/galion-knowledge/pull/52
- Branch: `cursor/f1-social-cues-f514`
- Prior head: `dba9f4554ad6a9fe1f40807cf841f133f581ad0d`
- Master merge: `da77690d6b7d4586f015b31cbd05f437986a7187`, which brought in `origin/master` `807ad7f3a3d6f0bc1669a471ac9b0aeda4130203` (PR #51, publication 13).
- Head SHA: this publication commit (`Publish core-pack digest 14 after F1 social cues cards.`). The swarm report lists `git rev-parse HEAD` after the push, because a commit cannot contain its own hash.
- Publication: 14
- sha256: `a334d64bcd13cf4a071829176de4328a84b039c7abba8657e8b22e7f078a6274`
- bytes: 3830076
- cards: 1939 (1,893 after publication 13 plus 46 `world/world-f1-social-*` files)
- Written: 2026-11-27 15:53:14 +0100 (Europe/Zagreb)

## Tests

- not run. Owner rule for this lane: write code only. Cargo, Playwright, the static site build, and the V2 truth-gate workflow were not run in this VM.
- Truth-gate report files were not regenerated or committed.

## CI and merge

- GitHub check `gate` is not the merge gate.
- Laptop gate on the prior head `dba9f4554ad6a9fe1f40807cf841f133f581ad0d`: FAIL. `addon_shard_manifest_matches_shard_manifest` panicked because the core digest was stale. The build reported computed `a9a0ad56145f5a903afca2402ea2a4af479c65c2e8f374aa87f3a7bcc233fd7c` for that pre-publication tree. This commit is the publication on master `807ad7f3a3d6f0bc1669a471ac9b0aeda4130203`.
- Laptop gate PASS for this publication commit: not received at the time of this note.
- Merge SHA: not merged at the time of this note. Merge is `gh pr merge 52 --merge` only after a `galion-studio` comment `Laptop gate PASS <this head sha>`. No rebase, no force-push, no admin merge.

## Refused

- No card edits. No other PRs. No S230 principles work. No ages UI. No new cards. Did not start while PR #51 was open.
