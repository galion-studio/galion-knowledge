# Galion Knowledge

Developed by Galion Labs. MIT License. Copyright (c) 2024–2026 Galion Labs.

The live V1 app is the Next.js site in `src/`. V2 does not replace it.

## V2

V2 is a refresh of the same page: same layout, same orb, same colours, same navigation. It is marked V2. It adds a short “What this knowledge is for” section.

V2 is the Base World Knowledge Pack. It is memory for HORBM, Galion’s retrieval brain, and for Galion Research. HORBM retrieves cards. It is not a large language model.

The page is built with [Eleventy](https://www.11ty.dev/) 3. Zola was the first choice because the owner is Rust-first, and it does not create one HTML page per JSON file. Eleventy’s pagination does that, so no custom generator is required. The built site is static HTML, CSS, and the vendored orb. Nothing from Next.js runs with it.

The orb is the V1 scene from `src/components/KnowledgeGlobe.tsx`, ported to vanilla JavaScript on the same Three.js 0.161 the V1 app depends on. The library files are vendored under `v2/src/assets/vendor/` (MIT). Icons are Lucide 0.378, the set V1 uses (ISC).

### Build

```bash
cd v2
npm install
npm run build
```

Output is `v2/_site/`. `npm run dev` serves it on port 3016.

### Knowledge rules

A claim names its source, its date, and who said it. Evidence is weighed (`none`, `weak`, `moderate`, `strong`). Disputed views stay side by side. `claim_type` is `fact`, `interpretation`, `opinion`, or `contested`. The pack can say it does not know. Do not invent a citation. Cards carried over from V1 with no source use status `unsourced - needs review` and `"sources": []`. V1 truth scores are not evidence.

The card contract is [v2/data/SCHEMA.md](v2/data/SCHEMA.md) and [v2/data/schema.json](v2/data/schema.json). `npm run build` checks every card against it.

### Where cards go

This site does not author the packs.

| Path | What it is |
| --- | --- |
| `v2/data/cards/world/*.json` | World Knowledge cards |
| `v2/data/cards/horbm/*.json` | HORBM Internal cards |
| `v2/data/cards/diary/*.json` | Diary cards, if that pack adds any |
| `v2/data/catalog.json` | Section and category names, colours, and icons. Owned by this site. |
| `v2/memory/` and `v2/docs/MEMORY_STACK.md` | Diary, memory stack, and the FTS5 export. Not built here. |

### Merging the sibling drafts

This branch does not contain their files. Merge them in this order, then run `npm run build` in `v2/`:

1. This site (schema, templates, orb).
2. [PR 1](https://github.com/galion-studio/galion-knowledge/pull/1) — HORBM cards in `v2/data/cards/horbm/`. These match the schema.
3. [PR 2](https://github.com/galion-studio/galion-knowledge/pull/2) — more HORBM cards in the same folder. Dotted ids, no summary, and section words other than `horbm`. The build still lists them. `index.json` there is skipped.
4. [PR 3](https://github.com/galion-studio/galion-knowledge/pull/3) — `v2/memory/` and `v2/docs/MEMORY_STACK.md`. The page build does not compile that crate.

No world-card pull request was open yet. Those files belong in `v2/data/cards/world/`.

```bash
git checkout cursor/knowledge-v2-static-a08e
git merge origin/cursor/horbm-comm-knowledge-af59
git merge origin/cursor/horbm-talk-cards-2549
git merge origin/cursor/horbm-memory-stack-4552
cd v2 && npm install && npm run build
```

Do not merge this draft until the owner says so. Do not deploy it from here.

Links from the page: [the GitHub repo](https://github.com/galion-studio/galion-knowledge), [galion.app](https://galion.app), and [Galion Research](https://galion.app/research). Each card links the sources it actually has.
