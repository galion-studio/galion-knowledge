# Truth gate

Every card under `v2/data/cards/` has to pass `v2/tools/truth-gate` before it is published. The gate checks the card. It does not author the card. It does not invent a source, raise an evidence label, or delete a file.

The machine report for the current pack is [truth-gate-report.json](truth-gate-report.json) and [truth-gate-report.md](truth-gate-report.md). How a card is challenged after publication is [REVIEW_POLICY.md](REVIEW_POLICY.md).

Run it from the repository root. Rust 1.85 or newer:

```bash
cargo run --manifest-path v2/tools/truth-gate/Cargo.toml -- \
  --cards v2/data/cards \
  --schema v2/data/schema.json \
  --catalog v2/data/catalog.json \
  --config v2/tools/truth-gate/truth-gate.toml
```

Exit 0 means no hard failure. Warnings remain in the report. `--check-urls` is off unless you pass it, so the default run and CI stay offline. A live check that fails is a warning. A host that refuses the request is not proof the source is false.

CI is `.github/workflows/v2-truth-gate.yml`. It tests the gate, runs it, refuses a pull request that deletes a file under `v2/data/cards/`, and runs `npm run build` in `v2/`.

## Checks

Hard failures block publication.

| Check | Result when it fails |
| --- | --- |
| JSON parses, and the card matches `v2/data/schema.json` | Hard |
| `id` matches the file name, and ids are unique | Hard |
| `section` is `world`, `horbm`, or `diary` and matches the folder | Hard. Another section word is a warning |
| A `fact`, and a card labeled `strong`, has at least one real `http` or `https` URL | Hard |
| Source host is Wikipedia or a mirror or derivative listed in `truth-gate.toml` | Hard |
| An IP address in a field or a source URL | Hard. The address is not copied into the report |
| `evidence_strength` is within what the sources can support | Hard. The ceiling is in the config |
| `none` has no sources, and any other strength has sources | Hard |
| Status containing `unsourced` has an empty `sources` array | Hard |
| `claim_type` `contested` has at least one `contested_views` entry | Hard |
| `strong` has only one independent source | Warning. Two is the usual bar. One primary can still be strong when the claim is that document |
| `strong` rests only on a preprint | Warning |
| A `fact` uses a word from the loaded-language list | Warning. The sentence is not rewritten |
| The card text names Wikipedia, Wikidata, or a listed derivative | Warning, including when the sentence says it was not used |
| `said_by` or `as_of_date` is empty on a fact or a strong card | Warning. Empty stays empty when the speaker or the date is unknown |
| Empty speaker or date on any other card | Note |
| An opinion is labeled `strong` while a qualifying source is attached | Warning. A design choice is not automatically a finding |
| A fact's only real URLs are house documents | Warning |
| A fact is labeled `weak` while the sources could support `strong` | Note. The gate does not raise the label |
| One outlet is at least 60% of a category's source URLs (at least 6 URLs), ignoring `doi.org` as a resolver | Warning |
| One government or IGO voice is at least 75% of a category's source URLs (at least 8 URLs) | Warning |
| Near-duplicate wording | Warning. Neither card is deleted |
| Category id is missing from `catalog.json`, or the catalog files it under another section | Warning |
| Status is outside the review labels | Warning |
| `related` id matches no card and no alias | Warning |
| Optional URL request does not succeed | Warning |

Source classes and their ceilings live in `v2/tools/truth-gate/truth-gate.toml`.

| Class | Ceiling | What it covers here |
| --- | --- | --- |
| `peer_reviewed` | strong | DOI, journal and publisher hosts, PMC, the Stanford Encyclopedia |
| `preprint` | strong | arXiv and the other preprint hosts in the config |
| `official` | strong | Government suffixes, courts, UN bodies, CERN's own pages, the Nobel record, standards bodies |
| `primary_text` | strong | Wikisource, Avalon, Liberty Fund, the Folger's own account, RFC, and the other transcription hosts in the config |
| `dataset` | strong | Slave Voyages, Glottolog, Scripps CO2, the Clay problem list |
| `scholarly_secondary` | moderate | OpenStax, the USHMM encyclopedia, museum and textbook hosts in the config |
| `house` | weak | `github.com`, `galion.app` |
| `news`, `other` | weak | A news host, or a host the config does not name |

`doi.org` is a resolver. Two different DOIs count as two independent sources. Two pages on the same host count as one. `doi.org` is not treated as one outlet in the diversity warning.

Wikisource is not Wikipedia. It is on the primary-text list. Add a host to `banned_suffixes` if it should be rejected.

The schema was aligned before the card pass. 147 cards already stored `legacy.v1_article_id`, `legacy.v1_slug`, and `legacy.v1_category`. The published schema had not named those keys. It does now. `history` was added as an optional append-only array. Those schema edits are not new claims. The before and after counts below are from the gate after that alignment.

## Before and after

The gate was run on all 436 cards, then the mechanical fixes below were applied, then it was run again. No URL liveness check was included in either run.

| | Before | After |
| --- | ---: | ---: |
| Cards | 436 | 436 |
| Hard failures | 25 | 0 |
| Warnings | 379 | 214 |
| Notes | 58 | 55 |

Hard failures before the fixes:

| Code | Count |
| --- | ---: |
| `evidence_above_ceiling` | 18 |
| `contested_without_views` | 7 |

Warnings that the fixes cleared: `category_not_in_catalog` 141, `missing_speaker` 5, `status_unlisted` 2. `strong_single_source` fell from 167 to 150 because cards that were no longer `strong` left that warning. `attribution_unknown` fell from 57 to 54 because three cards gained a speaker from authors already on their sources.

## Cards changed

34 card files changed. `v2/data/catalog.json` gained 22 category ids the cards were already using, so the site has a name, a colour, and an icon for them. No claim text was rewritten. No source was added.

Evidence was lowered on 18 cards. Each has a `history` entry. Where the status was `sourced`, it is now `sourced - needs review`.

House documents, `strong` to `weak`:

- `horbm-empathy-weight`
- `horbm-harm-and-limits`
- `horbm-persona-galion-one`
- `horbm-persona-galion-research`
- `horbm-politeness-house`
- `horbm-remember-when-asked`
- `horbm-withdrawal`

A textbook or a museum encyclopedia, `strong` to `moderate`:

- `world.microbes-openstax`
- `world.immune-innate-adaptive`
- `world.photosynthesis-openstax`
- `world.holocaust-ushmm`
- `world.holocaust-other-groups`
- `world.history.holocaust-documentation`
- `world.history.holocaust-victim-counts`
- `world.poland-invasion-1939`
- `world.geography.prime-meridian-1884`
- `world.geography.greenwich-meridian-1884`
- `world.history.greenwich-time-adoption`

`said_by` was empty and the source authors were already on the card. The field is those authors, joined. No name was added:

- `world.nature.plate-tectonics`
- `world.science.black-holes`
- `world.biology.dna-genetics`
- `world.law.presumption-of-innocence`
- `world.history.greenwich-time-adoption`
- `world.science.quantum-mechanics`
- `world.science.big-bang`
- `world.medicine.readiness-potential`

`contested_views` was empty on a contested card. The views already stated in the body were copied into the field. No side was added:

- `world.arts.depiction`
- `world.philosophy.logical-fallacies`
- `world.society.democracy`
- `world.philosophy.social-contract`
- `world.moral-relativism-sep`
- `world.unsourced-nordic-model`
- `world.unsourced-buddha-birth-year`

Status labels, with no change to the sources:

- `world.medicine.streptomycin-investigation-1948` and `world.arts.iliad-attributed-to-homer`: `partially_sourced` to `sourced - needs review`
- `world.geography.prime-meridian-1884`, `world.geography.greenwich-meridian-1884`, `world.history.greenwich-time-adoption`, `world.history.holocaust-documentation`, `world.history.holocaust-victim-counts`: `sourced` to `sourced - needs review` because the evidence label was lowered

## Remaining problems

These are still in the report. They are not hidden by the exit code.

| Code | Count | What a reviewer is looking at |
| --- | ---: | --- |
| `strong_single_source` | 150 | Strong with one independent source. Often the claim is the wording of that one document. A second independent source is still the usual bar. The ids are in the JSON report. |
| `attribution_unknown` | 54 | Speaker or date is empty on a card that is not a fact and not strong. Most of these are unsourced on purpose. Empty is the honest value. |
| `contested_single_source` | 19 | A contested card has fewer than two independent sources. The Nordic-model card and the Buddha birth-year card now record both views and still have no source. The SEP cards often rest on one encyclopedia entry. |
| `outlet_dominates` | 12 | Ten HORBM categories take at least 60% of their URLs from `github.com`. That is the house persona, not outside corroboration. `world/philosophy` takes 34 of 50 URLs from `stanford.edu`. `world/astronomy` takes 5 of 6 from `nasa.gov`. |
| `voice_dominates` | 1 | `world/earth`: US government hosts are 8 of 10 source URLs. |
| `loaded_language` | 9 | A fact card contains a listed word. The sentences were not rewritten. See below. |
| `near_duplicate` | 7 | Two cards share wording. Neither was deleted. See below. |
| `fact_house_only` | 5 | `horbm-empathy-weight`, `horbm-harm-and-limits`, `horbm-withdrawal`, `horbm-persona-galion-research`, `horbm-persona-galion-one`. The evidence is now `weak`. The claim type is still `fact` because the house URL is real. |
| `opinion_marked_strong` | 5 | `horbm-barge-in`, `horbm-hedge-a-guess`, `horbm-mood-point-80ms`, `horbm-no-inferred-portrait`, `horbm-say-i-dont-know`. A qualifying source is attached, so the ceiling allows `strong`. A reviewer still has to say whether the claim is that source's finding or the house rule. |
| `strong_on_preprint` | 5 | `horbm-attribution-gate`, `horbm-do-not-chase-turns`, `horbm-xiaoice-empathy-facts`, `world.noether-1918`, `world.technology.transformer-architecture`. |
| `mentions_wikipedia` | 1 | `world.science.entropy` names Wikidata and says that gloss is not Clausius and is not used. |
| `sources_stronger_than_label` | 1 | `horbm.age.motherese-is-for-infants` is `weak` and cites a DOI. The label was not raised. |

Loaded-language flags, and the word that fired:

| Card | Words |
| --- | --- |
| `world.genocide-convention` | genocide |
| `world.history.holocaust-documentation` | genocide, nazi |
| `world.history.holocaust-victim-counts` | genocide, nazi, nazis |
| `world.holocaust-other-groups` | nazis |
| `world.holocaust-ushmm` | genocide, nazi, nazis, regime |
| `world.law.human-rights-declaration` | barbarous |
| `world.law.nuremberg-crimes` | atrocity |
| `world.nasa-warming-attribution` | unprecedented |
| `world.rwanda-april-1994` | genocide |

These are the documents' own words or the ordinary name of the event. The flag is a lexicon hit. It is not a finding that the card is propaganda.

Near-duplicate pairs kept side by side:

| Card | Other card | Shared-word score |
| --- | --- | ---: |
| `horbm-withdrawal` | `horbm.safety.withdrawal` | 0.48 |
| `horbm-say-i-dont-know` | `horbm.honesty.i-dont-know` | 0.41 |
| `world.photoelectric-1905` | `world.science.photoelectric-effect` | 0.43 |
| `world.eht-m87-2019` | `world.eht-sgr-a-2022` | 0.43 |
| `horbm.age.do-not-guess` | `horbm.culture.do-not-infer` | 0.26, titles 0.50 |
| `world.history.eclipse-1919-light-deflection` | `world.light-deflection-1919` | 0.27, titles 0.45 |
| `world.metre-speed-of-light` | `world.science.speed-of-light-exact` | 0.27, titles 0.54 |

The two Event Horizon Telescope cards are different observations that share a description of the instrument. The withdrawal pair and the "I don't know" pair are the closest copies. Merging them would delete a file. That is the archive rule, so both stay, and the warning stays.

No card in this pack used a Wikipedia URL. The ban is still a hard check, and it is covered by tests.
