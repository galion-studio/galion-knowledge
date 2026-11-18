# World Knowledge cards

Retrieval cards for the Base World Knowledge Pack. This directory is K2's lane: true history, science and physics, and how societies, economies, biology, and Earth systems work. The twelve categories are the ones in `src/lib/knowledge-data.ts`.

## Schema

`v2/data/card.schema.json` was not on the remote when these cards were written, and the site-lead branch was not readable. The cards use the fallback fields so they can be adapted when that schema lands:

- `id`
- `title`
- `section` (`world`)
- `category` (one of the twelve ids)
- `body`
- `claim_type`: `fact`, `interpretation`, `opinion`, or `contested`
- `sources`: `{title, url, author, date, accessed}`
- `evidence_strength`: `strong`, `moderate`, `limited`, `disputed`, or `unknown`
- `said_by`
- `as_of_date` (the source's date, or `2026-11-18` when the card is a reading checked that day)
- `status`: `sourced`, `partially_sourced`, or `unsourced`
- `contested_views`: `{position, held_by, source_url}`
- `related` (other card ids in this pack)

`index.json` lists every card. `CHECKLIST.md` is the source check.

One card is one claim cluster, about 110 to 170 words. A number in a body was read from the linked source on 18 November 2026. Where the science or the history is open, the card says so and keeps the disagreement.

## License

The wording of the cards is released under the MIT license, copyright 2026 Galion Labs. See `LICENSE`. The sources cited in each card stay the property of their authors and are not relicensed.
