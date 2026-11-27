# PR #53 — F1 food, drink, hunger, and digestion (S209)

- PR: https://github.com/galion-studio/galion-knowledge/pull/53
- Branch: `cursor/f1-food-hunger-fullness-e709`
- Prior head: `bbcd76d7388fa0aa50aed4fcd1a01c1d133f1f26`
- Master merge: `0f03ac9d2b510a025ab8ea33b15ba071ed6c2292`, which brought in `origin/master` `2bfdd78fac4d2065f0ce5b09e6c8226db2444bf8` (PR #52, publication 14).
- Head SHA: this publication commit (`Publish core-pack digest 15 after F1 food cards.`). The swarm report lists `git rev-parse HEAD` after the push, because a commit cannot contain its own hash.
- Publication: 15
- sha256: `cb527b0d91229b18826c04c458145429c52ada5a0bb37f6d6d124c00f9d10409`
- bytes: 3919366
- cards: 1989 (1,939 after publication 14 plus 50 `world/world-f1-food-*` files)
- Written: 2026-11-27 15:59:22 +0100 (Europe/Zagreb)

## Tests

- not run. Owner rule for this lane: write code only. Cargo, Playwright, the static site build, and the V2 truth-gate workflow were not run in this VM.
- Truth-gate report files were not regenerated or committed.

## CI and merge

- GitHub check `gate` is not the merge gate.
- Laptop gate PASS for this publication commit: not received at the time of this note.
- Merge SHA: not merged at the time of this note. Merge is `gh pr merge 53 --merge` only after a `galion-studio` comment `Laptop gate PASS <this head sha>`. No rebase, no force-push, no admin merge.

## Refused

- No card edits. No other PRs. No S230 principles work. No ages UI. No new cards. Did not start while PR #52 was open.
