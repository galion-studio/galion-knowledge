# HORBM internal knowledge: how to talk with people

Perpetual Open MIT License. Copyright (c) 2026 Galion Labs.

Swarm S3 of 4 for knowledge.galion.app V2. This file is the outline. The cards under `v2/data/cards/horbm/` are the seed. HORBM means Heuristic Open Retrieval Brain Model: Galion's retrieval-based brain, not a large language model, CPU-first, with short-term and long-term memory, a persona, an inner-life layer, and real-time full-duplex voice.

This pack answers one question: **what must that brain know in order to communicate with a person?** It does not design the retriever, the ranker, the diary store, or the mouth. Those belong to other notes and other swarms.

## What was followed

`v2/data/SCHEMA.md` was not on `master` on 2026-11-18. Sibling S1 (`bc-fe88f5a4`) had not published it. Cards therefore include every field from the swarm brief:

`id`, `title`, `section`, `category`, `body`, `claim_type`, `sources[{title,url,author,date,accessed}]`, `evidence_strength`, `said_by`, `as_of_date`, `status`, `contested_views[]`, `related[]`.

They also include `summary`, `tags`, `read_time_min`, and `sources[].note`, because that is the object S1's card writer was already emitting. If the published schema later forbids those extras, drop the extras and keep the brief's fields. `section` is always `horbm`.

S1's unpublished catalog, as read from that run, listed HORBM categories `conversation`, `affect`, `persona`, `honesty`, and `culture`. This pack adds `safety` and `memory`, because consent and memory etiquette are part of the brief and do not fit the other five without hiding them. Open question 1 asks S1 to add those two categories to the catalog.

## How to read a card

| `claim_type` | What it means here |
|---|---|
| `fact` | What an opened source says. A fact names who, when, and where. |
| `interpretation` | A reading across more than one opened source. |
| `opinion` | A Galion design rule. Not a measurement. |
| `contested` | A live disagreement. Both views stay on the card. |

`evidence_strength` is `strong` when the relevant text was opened on 2026-11-18, `moderate` when a bibliographic record and an abstract or a second paper's restatement were opened, and `weak` when the card is a design choice that cites those sources but is not itself a finding. No card invents a paper, a page, a DOI, or a number. Where a famous work was not opened, the card says so and does not restate a result from memory.

`status` is `sourced - needs review` when the main claim is what a source says, and `draft` when the main claim is a house rule. Nothing here is `published`.

## Taxonomy

The brain needs eight kinds of knowledge. The leaves are the card ids.

### 0. Scope

What this pack is, and what it refuses to be.

- `horbm-pack-scope`

### 1. Conversation — category `conversation`

Turn-taking, overlap, backchannels, barge-in, repair, and grounding, for a full-duplex voice.

- `horbm-turn-taking-rules` — one speaker at a time is the norm; turns are built from units; a transition-relevance place is where the rules apply
- `horbm-overlap-gaps-silence` — overlap, gap, pause, and lapse are different; silence the person did not ask to fill stays silence
- `horbm-backchannel-not-floor` — a continuer is not a bid for the turn
- `horbm-barge-in` — a competing start means stop; the newer turn wins
- `horbm-repair` — prefer fixing a miss over inventing the sentence; "huh?" is a repair initiator, not chatter
- `horbm-grounding` — a claim is shared only once it has been accepted; a continuer is not that acceptance
- `horbm-full-duplex-duties` — what the cards above require of a voice that can hear while it speaks

### 2. Honesty — category `honesty`

How to say "I don't know", and how to keep a fact, a guess, and an opinion apart.

- `horbm-grice-maxims` — quantity, quality, relation, manner
- `horbm-say-i-dont-know` — the lines that are allowed when nothing was found
- `horbm-fact-and-opinion` — fact, interpretation, opinion, contested
- `horbm-hedge-a-guess` — one deliberate hedge, in the same sentence as the guess
- `horbm-attribution-gate` — a claim about the world is cited, marked as a guess, or withheld

### 3. Affect — category `affect`

Emotion is a point in arousal, valence, and dominance, stepped on the 80 ms frame. Category names are not that point.

- `horbm-circumplex-and-pad` — Russell's circumplex and Mehrabian's pleasure, arousal, and dominance, and what this pack does not copy from them
- `horbm-mood-point-80ms` — the house state: three floats, every 80 ms, beside the heartbeat
- `horbm-categories-contested` — Ekman, Barrett, and Cowen do not agree; Cowen names stay optional pins
- `horbm-empathy-weight` — empathy is a weight on the voice, not a script, and anger is answered rather than copied
- `horbm-xiaoice-empathy-facts` — what the XiaoIce paper actually reports

### 4. Persona — category `persona`

The same voice, every turn. Not an 18-year-old character, and not a contest to keep the person on the line.

- `horbm-persona-galion-one` — the companion voice
- `horbm-persona-galion-research` — the research voice
- `horbm-persona-filter` — consistency is a filter in front of the reply, not a learned embedding
- `horbm-do-not-chase-turns` — a finished call can be the success; length is not

### 5. Culture — category `culture`

Politeness and timing are not one recipe.

- `horbm-turn-timing-varies` — a shared avoidance of overlap, and a real spread in average gap
- `horbm-politeness-face` — Brown and Levinson, as far as an opened critique lets this pack say
- `horbm-politeness-not-universal` — face, as Brown and Levinson compose it, is contested
- `horbm-grice-contested` — the maxims are not a cultural universal on the evidence this pack opened
- `horbm-politeness-house` — the small politeness Galion actually uses

### 6. Safety — category `safety`

Consent, what may not be inferred, and what the voice refuses.

- `horbm-consent-bits` — sense, adapt, remember, share; default deny
- `horbm-no-inferred-portrait` — no inferred age, gender, personality, diagnosis, or emotion history
- `horbm-withdrawal` — withdrawal wipes RAM history in the same call
- `horbm-harm-and-limits` — no method for harm, no sexual or romantic talk with anyone under 21, no money action on voice alone

### 7. Memory etiquette — category `memory`

Remember a fact about the person only when they asked. The session dies at hang-up otherwise.

- `horbm-remember-when-asked` — the `remember` bit, and the three kinds of row that may be kept
- `horbm-memory-stores` — session ring, episodic rows, semantic claims; no second portrait
- `horbm-forgetting-and-deletion` — use and time may fade a row; withdrawal does not wait for the fade

## Where the design already lives

This pack does not replace the research notes. It turns the part of them that is about talking into cards a retriever can hold.

| Note | What this pack takes from it |
|---|---|
| [R3, draft PR #208](https://github.com/galion-studio/galion-one-voice/pull/208) | Memory etiquette, persona as a filter, mood point every 80 ms, stop-aware score, no inferred portrait. Opinions of that note stay opinions. |
| [R1, draft PR #209](https://github.com/galion-studio/galion-one-voice/pull/209) | Not this pack. Retrieval. A claim still has to carry who, date, and locator when it is spoken. |
| [R2, draft PR #210](https://github.com/galion-studio/galion-one-voice/pull/210) | Not this pack. Ranking and wording. This pack says what the wording must not do. |
| [R4, draft PR #207](https://github.com/galion-studio/galion-one-voice/pull/207) | Not this pack. CPU and the turn budget. Full-duplex duties here are about conduct, not milliseconds of compute. |
| `LOCKS.toml`, `GALION-ONE.md`, `GALION-RESEARCH.md`, `EMPATHY.md` on `main` | Where a research note and a lock disagree, the lock wins. |

R3's open questions that this pack repeats, and does not close: whether `remember` is per fact; whether withdrawal deletes user-text rows on disk in the same call; whether an unrequested silence counts as a close; who extracts a machine-readable persona card from the prose files.

## What was opened on 2026-11-18

Opened in full or in the sections cited: Zhou, Gao, Li, and Shum, arXiv:1812.08989 (PDF); Levinson and Torreira, *Frontiers in Psychology*, 2015 (PDF); Stivers and colleagues, *PNAS*, 2009 (PMC HTML); Grice, "Logic and Conversation", 1975 (reprint); Matsumoto, *Journal of Pragmatics*, 1988 (PDF); Regulation (EU) 2024/1689, OJ HTML, Article 5; `LOCKS.toml`; `GALION-ONE.md`; `GALION-RESEARCH.md`; `EMPATHY.md`; the R3 note at commit `65c1249f`.

Opened as an abstract or a publisher record, and not restated past that: Dingemanse, Torreira, and Enfield, *PLOS ONE*, 2013; Cowen and Keltner, *PNAS*, 2017; Cowen, Elfenbein, Laukka, and Keltner, *American Psychologist*, 2019; Barrett, *Social Cognitive and Affective Neuroscience*, 2017; Kuppens, Allen, and Sheeber, *Psychological Science*, 2010; Heldner and Edlund, *Journal of Phonetics*, 2010; Rashkin and colleagues, arXiv:2112.12870. Bibliographic records for the other works named on the cards were checked on Crossref the same day. Their bodies were not opened, and the cards do not invent findings from them.

## Open questions

1. Will S1's catalog accept categories `safety` and `memory`, or should those cards move under `honesty` and `persona`?
2. S1 planned `schema_version: "knowledge-card/2"` and, in one note, `additionalProperties: false`. These cards omit `schema_version` because the written seed objects omitted it. Confirm before a builder rejects them.
3. R3 question 1: is `remember` per fact, per session, or only the affect baseline `AffectStore` already exports? This pack follows R3's opinion (per fact, default deny) and marks it as an opinion.
4. R3 question 2: on withdrawal, are user-text rows on disk deleted in the same call? The lock this pack opened wipes RAM. Disk is not settled.
5. R3 question 7: is an unrequested silence a close? Galion One says it stays silence. This pack does not score it as a goodbye.
6. R3 question 8: the deny-lists live in prose. Who extracts the machine-readable persona card, and who checks it against `GALION-ONE.md` and `GALION-RESEARCH.md`?
7. The 80 ms step is the audio frame in `LOCKS.toml`. It is not a published emotional time constant. `alpha` on the mood lerp is unset (`literature = "none"` in R3). Who sets it?
8. Cowen and colleagues report that categories organize vocal-burst recognition more than valence and arousal, and also that the categories sit on continuous gradients. The house state is still the three floats. Is an optional Cowen pin allowed to be spoken ("you sound amused"), or does "do not name their emotion" in the persona files forbid the pin on the mouth as well as in memory?
9. Grice's second maxim of Quantity is one Grice himself calls disputable. The research voice says "the answer, the limit, stop." Is that a Quantity rule, a persona length rule, or both?
10. Phone-path English-only is a product limit in the persona files. It is not a finding that turn-taking or politeness is English. A later language pack needs its own politeness cards. This pack does not write them.
