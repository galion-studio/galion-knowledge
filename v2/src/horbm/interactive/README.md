# How agents update the HORBM diagram

The interactive page at `/horbm/interactive/` fetches `horbm.json` when it loads. The static PNG is drawn with the same renderer. Edit the JSON, not the page code, when a layer, step, label, status, or connection changes.

Mate accepted the open recommendations on 19 Nov 2026. Those parts are `status` `A` (Accepted). `R` remains in the schema for a future recommendation. A dashed gold step (`kind` `rec`) is still the mark for one that is not accepted yet.

## Edit

1. Edit [`horbm.json`](horbm.json). The shape is [`horbm.schema.json`](horbm.schema.json).
2. Bump `version` (`1.2.3`) and set `updated` to an ISO timestamp with a timezone. Set `updatedLabel` to the date shown in the footer.
3. Open a pull request. CI checks the JSON. After deploy, the live page picks up the file. A JSON-only change does not need a code change.

## Where things live

- `bands` is the center stack, top to bottom. `n` is the layer number. `columns` is `4` for one row of chips and `3` for the six-chip grid. Layer 0 has `"guide": true`, so its pill stays "guide, not a step".
- `down` is the left path from top to bottom. Array order is the step number. `layer` is the connection to a center layer.
- `up` is the right path in time order, starting at the machines. The page draws this list from the bottom upward. The first object is step 1.
- `after` is off the hot path, once the reply has been spoken. Each item's `layer` is the "after" pill on that layer.
- `kind` on a step is `main`, `rec` (dashed gold, recommended), `cond` (dashed sky, only if needed), or `skip` (dotted; the turn passes and nothing runs).
- `status` on a chip or part is `B` built, `A` accepted, `R` recommended, or `C` if needed. The short labels are `statuses.*.label`. The Blue Ink/Sky colors stay in `diagram.css`.

Pills are computed from `down`, `up`, and `after`. Move a step's `layer` and the pill moves with it.

Current paths, from the shipped file: down `1 > 3 > 5 > 7+8 > 4 > 6 (if needed) > 11`, up `11 > 6 (if needed) > 5 > 9 > 2 > 3 > 1 > output`. Off the hot path: layer 4 state, layer 7 memory, layer 10 evals.

## Validate

From the repository root, with Rust 1.85 or newer (the same floor as the truth gate; CI uses stable):

```bash
cargo test --locked --manifest-path v2/tools/horbm-diagram/Cargo.toml
cargo run --locked --manifest-path v2/tools/horbm-diagram/Cargo.toml --quiet
```

The check fails when the JSON does not match the schema, a step points at a missing layer, a string contains an IP address, or a string contains a Wikipedia link.

The renderer check does not need Rust:

```bash
node --test v2/tools/horbm-diagram/render.test.mjs v2/tools/horbm-diagram/github.test.mjs v2/tools/horbm-diagram/fit.test.mjs v2/tools/horbm-diagram/stamp-assets.test.mjs
```

After `npm run build`, the interactive page test loads the built site:

```bash
cd v2
npx playwright install chromium
npx playwright test
```

Build the site from `v2/`:

```bash
npm ci
npm run build
```

## Regenerate the PNG

Google Chrome has to be installed. From the repository root:

```bash
node v2/tools/horbm-diagram/render-png.mjs
```

That writes `v2/src/horbm/horbm-layers-twoway.png` from `horbm.json`. Commit the PNG in the same pull request as the JSON so the image and the interactive page do not drift.

CI does the same check. The HORBM diagram workflow validates `horbm.json`, runs the renderer tests, and, when the JSON, `diagram.js`, or `diagram.css` is newer than the PNG, renders the PNG and commits it. A merged pull request therefore updates both the image and the page. The page reads `horbm.json` on each load.

## Build progress

Each layer has a `build` object in `horbm.json`:

- `percent` is an integer from 0 to 100.
- `state` is `planned`, `in progress`, `done`, or `blocked`.
- `agent` is the name of the agent working on that layer, or an empty string.
- `pr` is the pull request number, or `null`.
- `note` is a short status line, or an empty string.

The page reads those fields as written. It does not recompute them from the chip statuses. Change them in a pull request when an agent starts, finishes, or blocks a layer. Bump `version` and `updated` in the same edit.

The numbers shipped on 19 Nov 2026 are a starting snapshot, not a live formula. A Built chip counted as 100, an Accepted chip as 25, and Recommended or If needed as 0. The layer percent is the rounded mean of its chips. The state is `done` only when every chip is Built, `in progress` when at least one chip is Built, and `planned` otherwise. `blocked` is left for an agent to set. No agent or pull request was assigned in that snapshot. The overall percent is the rounded mean of the twelve layer percents. That overall number is 40.

The public page at `/horbm/interactive/` shows only that overall percent, next to the Galion Labs credit and the short commit SHA. It does not list per-layer progress, agents, pull requests, or CI.

## Owner progress view

`/horbm/interactive/admin/` is a read-only board for the owner: each layer’s percent and state, the assigned agent and pull request, recent commits, open and merged pull requests that touched the diagram, and the latest public GitHub Actions runs. It also reads `horbm.json` from an open diagram pull request, when the public contents API answers, and shows a layer whose progress differs from the published file. The board loads baked `development.json` immediately, then refreshes the public GitHub data every 5 minutes. A Refresh button reads again. There is no token and no edit control.

The public pages do not link to this path. The admin page sends `noindex, nofollow`. That hides it from search. It does not stop someone who knows the URL.

### Cloudflare Access

Turning on the gate is a separate step and needs the owner’s yes. This pull request does not enable it, and the repository has no Access token or policy.

When the owner says yes, add a self-hosted Cloudflare Access application:

1. In Cloudflare Zero Trust, open Access, then Applications, then Add an application, then Self-hosted.
2. Set the application domain to `knowledge.galion.app` and the path to `horbm/interactive/admin`.
3. Add one Allow policy whose Include rule is the owner’s email, or the owner’s identity group. Do not add a Bypass policy, an Everyone policy, or a service token in the site files.
4. Leave the session length as the owner chooses. Access prompts for that identity before the HTML is served.

Until that application exists, the path is still a public static file. Do not treat the unlinked URL as a secret.

`fonts/HORBMSans-Variable.woff2` is a Latin subset of Inter under the SIL Open Font License (`fonts/OFL.txt`). The family is renamed because a subset is a modified font.

The Download PNG button loads `html2canvas.min.js` (html2canvas 1.4.1, MIT) only when someone clicks it, then draws the current zoom and pan. Leave that file next to the page.
