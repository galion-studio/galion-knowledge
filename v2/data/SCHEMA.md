# Knowledge card schema

Version: 1. Published for the V2 swarm. The machine-readable copy is [schema.json](schema.json).

This site reads cards. It does not author them.

| Path | Owner |
| --- | --- |
| `v2/data/cards/world/*.json` | World Knowledge cards |
| `v2/data/cards/horbm/*.json` | HORBM Internal cards |
| `v2/data/cards/diary/*.json` | Diary and Memory cards, if that pack adds any |
| `v2/data/catalog.json` | This site. Names, colours, and icons for sections and categories. |
| `v2/memory/` and `v2/docs/MEMORY_STACK.md` | Diary and Memory stack. Not built by the page tool. |
| `v2/shards/<id>/` | Add-on shards. Optional packs on top of the core. `shard.json` is `galion-shard-manifest/1`. Cards, when a shard is seeded, are `v2/shards/<id>/cards/<id>.json` with `section` `shards` and `category` equal to the shard id. The build checks the card-bundle sha256. See [SHARDS.md](../docs/SHARDS.md). |

One card is one JSON file. The file name is `{id}.json`. The parent folder name is the `section`.

## Fields

| Field | Required | Values |
| --- | --- | --- |
| `id` | yes | Lowercase slug. Must match the file name. Hyphens are the usual form. Dots are accepted. |
| `title` | yes | Short title. |
| `section` | yes | `world`, `horbm`, or `diary`, matching the folder. If a file in one of those folders uses another word, the site files it under the folder and keeps the card. |
| `category` | yes | A category id from `catalog.json` when one fits. |
| `summary` | expected | One or two sentences. Shown on cards. If it is missing, the build uses the start of the body. |
| `body` | yes | Markdown. The article page renders this. |
| `claim_type` | yes | `fact`, `interpretation`, `opinion`, or `contested`. |
| `sources` | yes | Array. May be empty. Each item: `title`, `url`, `author`, `date`, `accessed`. `note` is optional. |
| `evidence_strength` | yes | `none`, `weak`, `moderate`, or `strong`. Words from earlier drafts are mapped: `unsourced` to none; `limited` and `design` to weak; `supported` and a sourced `not-settled` to moderate; `established` to strong. |
| `said_by` | yes | Who said it. Empty string if unknown. |
| `as_of_date` | yes | `YYYY-MM-DD`, or `YYYY-MM`, or empty if there is no date. |
| `status` | yes | Use `unsourced - needs review` when there is no source. Other cards may use `draft`, `sourced - needs review`, or `reviewed`. |
| `contested_views` | yes | Array. May be empty. Each item: `label`, `summary`, `status`. Keep disagreements side by side. Do not invent the other side. |
| `related` | yes | Array of card ids. May be empty. Ids that are not in the pack are not linked. An alias id still resolves. |
| `aliases` | no | Other ids for this same card, including dotted ids. Each alias is also served at `/article/<alias>/`. |
| `tags` | no | Array of short strings. |
| `read_time_min` | no | Positive integer. The site estimates from the body if this is omitted. |
| `legacy` | no | Optional V1 display numbers. See below. |

`sources[].url` is an `http` or `https` URL, or `""` when there is no public URL yet. A `fact` card needs at least one source with a non-empty URL. A card whose status contains `unsourced` must have `"sources": []`.

Do not invent a citation. An empty list is the honest value.

## Evidence

`none` means no source is attached. `weak` means a draft note, a single secondary mention, or a house rule. `moderate` means a primary document that does not settle the whole question, or a self-reported figure. `strong` means the claim is the wording of the primary document itself, or several independent sources agree. The site does not treat a high number from V1 as strength.

## Legacy

V1 showed a truth score and a source count. Those were not citations. If a card keeps them, put them under `legacy` and say so in `legacy.note`. The site does not display them as a truth score.

```json
"legacy": {
  "v1_id": "1",
  "v1_truth_score": 100,
  "v1_source_count_displayed": 847,
  "v1_last_verified_displayed": "2024-12-15",
  "note": "V1 displayed these figures. They are not citations and not measurements."
}
```

## Example

```json
{
  "id": "example-card",
  "title": "Example card",
  "section": "world",
  "category": "science",
  "summary": "One sentence a person can scan.",
  "body": "The claim, in Markdown.\n",
  "claim_type": "interpretation",
  "sources": [],
  "evidence_strength": "none",
  "said_by": "",
  "as_of_date": "",
  "status": "unsourced - needs review",
  "contested_views": [],
  "related": [],
  "tags": ["example"]
}
```

## Drafts already open

Two HORBM card drafts and the memory crate were opened before this schema was on the branch.

- [PR 1](https://github.com/galion-studio/galion-knowledge/pull/1) matches this schema (`v2/data/cards/horbm/*.json`, hyphen ids).
- [PR 2](https://github.com/galion-studio/galion-knowledge/pull/2) uses dotted ids, no `summary`, and section words such as `conversation` and `stance`. The build still lists those files under HORBM because they sit in `cards/horbm/`. `index.json` in that folder is not a card and is skipped.
- [PR 3](https://github.com/galion-studio/galion-knowledge/pull/3) is `v2/memory/` and `v2/docs/MEMORY_STACK.md`. This site does not build that crate.

No world-card draft was open when this page was built. World pages stay empty until that pack is added.

## Check

`npm run build` in `v2/` reads every card and stops if a file breaks this schema. The page build does not write an FTS5 index. That export belongs to `v2/memory`.
