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
node --test v2/tools/horbm-diagram/render.test.mjs v2/tools/horbm-diagram/github.test.mjs
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

## Live development

The page is read-only. It does not offer edit or propose links. The Live development panel lists recent commits and open or merged pull requests that touched the diagram: time, short SHA, title, the layers that changed, and a link to view the commit or pull request. Changed layers are highlighted, with an "updated … ago" badge.

The build writes `development.json` from git, and adds public pull requests when the GitHub API answers. The page then refreshes that public data in the browser. No token is used. The footer SHA is the same commit, shortened.

`fonts/HORBMSans-Variable.woff2` is a Latin subset of Inter under the SIL Open Font License (`fonts/OFL.txt`). The family is renamed because a subset is a modified font.

The Download PNG button loads `html2canvas.min.js` (html2canvas 1.4.1, MIT) only when someone clicks it, then draws the current zoom and pan. Leave that file next to the page.
