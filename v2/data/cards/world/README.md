# World knowledge pack

Base world-knowledge cards for HORBM, Galion's retrieval brain, and Galion Research. The cards are facts, mechanisms, and labeled disagreements. They are not a briefing.

**License.** Copyright 2026 Galion Labs. The card texts in this directory are released under the MIT License. Primary sources keep their own rights. Short quotations are identified and limited to the wording needed to state a claim. This pack does not relicense those sources.

## Schema

Sibling swarm S1 had not published `v2/data/SCHEMA.md` or `schema.json` on origin when this pack was written. Origin had only `master`. Cards therefore use the fallback contract:

`id`, `title`, `section`, `category`, `body`, `claim_type`, `sources`, `evidence_strength`, `said_by`, `as_of_date`, `status`, `contested_views`, `related`.

`meta` is additive. It carries the license, a schema.org `ClaimReview` on sourced cards, optional Wikidata Q-ids that were checked against a search (ambiguous hits were dropped), and, for migrated V1 text, the old scores under `legacy_v1`. Those legacy truth scores and source counts are not evidence.

`claim_type` is `fact`, `interpretation`, `opinion`, or `contested`.

`evidence_strength` is `strong`, `moderate`, `limited`, `not-settled`, or `none`.

`status` is `sourced` or `unsourced-needs-review`.

A contested view is a position with its own sources. It is not a second column for an unsourced slogan.

## Counts

V1 `src/lib/knowledge-data.ts` contains **40** articles. The brief said 42. No further V1 articles were in the file, and none were invented.

| Category | Sourced | Unsourced, needs review | Total |
| --- | ---: | ---: | ---: |
| arts | 2 | 0 | 2 |
| biology | 5 | 0 | 5 |
| geography | 5 | 0 | 5 |
| history | 5 | 5 | 10 |
| law | 4 | 1 | 5 |
| mathematics | 5 | 0 | 5 |
| medicine | 3 | 2 | 5 |
| nature | 5 | 0 | 5 |
| philosophy | 5 | 4 | 9 |
| science | 5 | 2 | 7 |
| society | 5 | 3 | 8 |
| technology | 5 | 2 | 7 |
| **Total** | **54** | **19** | **73** |

Of the 40 V1 articles, 21 were rewritten against sources on the same slug. The other 19 keep their V1 wording, with empty `sources` and status `unsourced-needs-review`. The remaining sourced cards are new and narrower than a textbook chapter: a mechanism, a document, or a disagreement that could be tied to a page that was actually opened.

Arts and medicine are short of five sourced cards on purpose. Further cards would have required sources that were not verified.

## How a sourced claim was allowed in

Bibliographic records were checked on Crossref or on the publisher, archive, or encyclopedia page named in `sources`. `accessed` is 2026-11-18. Numbers and quotations appear only when they were read on that pass. A famous figure that was not re-read (a GPS microsecond budget, a chromosome count, an arc-second from 1919) is omitted rather than remembered.

Wikidata Q-ids are cross-references. They are not citations.
