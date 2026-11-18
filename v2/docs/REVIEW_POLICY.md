# How a card is challenged and updated

A card is a claim with its sources, the date it is stated as of, and who said it. It is not a verdict. Evidence is weighed. Disagreement stays on the card. The pack can say it does not know.

This is the rule for changing a card after the truth gate has passed it. The gate itself is [TRUTH_GATE.md](TRUTH_GATE.md).

## A challenge

Anyone may challenge a card by proposing a change to the file. The proposal names:

- the card id
- the sentence being challenged
- the evidence for the change

Evidence is a source with `title`, `url`, `author`, `date`, and `accessed`. The URL is `http` or `https`, or the field is empty when there is no public URL and the note says so. Wikipedia and the mirrors and derivatives in `v2/tools/truth-gate/truth-gate.toml` are not evidence. A missing source is an empty list. It is not filled in from memory.

A challenge that has no source, and is not itself the statement "this is unknown", does not raise `evidence_strength` and does not turn the card into a `fact`.

## Keep the disagreement

If the new evidence contradicts the card, add a `contested_views` entry for the new evidence and keep the earlier view. Do not delete the earlier view. Do not invent a side that neither the card nor the new source states. If both views are real, set `claim_type` to `contested`.

`fact`, `interpretation`, `opinion`, and `contested` stay distinct. A house rule is not a research finding. A loaded word on a fact is a flag for a person. It is not an automatic rewrite and not an automatic rejection.

## Append history

When a published field changes, append one object to `history`. Do not edit an older history entry. Do not remove one.

```json
{
  "date": "2026-11-18",
  "change": "evidence_strength",
  "from": "strong",
  "to": "moderate",
  "note": "Which source was opened, and why the label changed."
}
```

`date` is the review date, `YYYY-MM-DD`. `change` is the field. `from` and `to` are the old and new values. `note` says what changed and which source justified it. If the body changes, the note quotes the previous summary or the previous sentence. The previous text also remains in git.

Set `as_of_date` to the review date when the claim itself changes. Leave each source's own `date` on that source. `said_by` is who made the claim the card reports. If that person is unknown, leave `said_by` empty. Do not write a name that is not already in the card or in the sources being added.

The evidence label moves down when the sources do not support it. It moves up only when a reviewer has opened the stronger source and says so in `history`. The truth gate does not raise a label by itself.

## Archive, never delete

A card file is not deleted. To retire a card:

1. Set `status` to `archived`.
2. Append `history` with the reason.
3. If a replacement card exists, put its id in `related`.

The text stays in the pack and on the site, marked archived. Git history is a second archive. It is not a reason to delete the file. The truth-gate workflow rejects a pull request that deletes a file under `v2/data/cards/`.

## Unknown is a valid state

A card may say it does not know. The honest shape is `sources: []`, `evidence_strength: "none"`, `status: "unsourced - needs review"`, and an empty `as_of_date` when there is no date. `claim_type` is not `fact`. An unsourced status with a non-empty `sources` array does not pass.

## Publish

A card is published when `npm run build` in `v2/` succeeds and the truth gate exits 0. Warnings stay in the report. They are part of the record.
