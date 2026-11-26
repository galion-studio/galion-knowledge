# HORBM communication knowledge

Perpetual Open MIT License. Copyright (c) 2026 Galion Labs.

Lane: `v2/data/cards/horbm/` only. This is the internal knowledge a Heuristic Open Retrieval Brain Model (HORBM) needs in order to talk with a person. HORBM is Galion's retrieval-based, non-LLM brain. It learns from past human interaction only inside the consent rules on these cards. Utterance realization, document retrieval, prosody-knob sizes, and the 80 ms clock are other lanes.

As of 2026-11-18, `v2/data/card.schema.json` was not on `origin/master`. These cards use the fallback fields named for K1: `id`, `title`, `section`, `category`, `body`, `claim_type` (`fact` | `interpretation` | `opinion` | `contested`), `sources` (`title`, `url`, `author`, `date`, `accessed`), `evidence_strength`, `said_by`, `as_of_date`, `status`, `contested_views`, `related`. `contested_views` items are objects with `position` and `source`. `index.json` is a manifest, not a card.

## How to read a card

A **fact** is something a named source says, and the body stays inside what was actually read. An **interpretation** is a reading of those sources for how to talk; it is announced as a reading. An **opinion** is a Galion design choice. It is not a measurement. **Contested** means the card's job is to keep a live disagreement side by side and not to average it.

`evidence_strength` is one of: `established` (a finding read in a primary paper or a review that quotes it, and widely used), `supported` (a peer-reviewed result whose abstract or relevant section was read), `limited` (the locator was checked and the body was not re-opened, or the claim is only the title), `design` (a Galion product or research-note choice, sourced to the file that states it), `unsourced` (no source; `sources` is empty). An unsourced card must not be spoken as a research result.

Those five words (`established`, `supported`, `limited`, `design`, `unsourced`) are this outline's labels. They are not the `evidence_strength` enum in `v2/data/schema.json`, which is `none`, `weak`, `moderate`, and `strong`. `v2/data/SCHEMA.md` records a mapping from the older words onto that enum. This note records the drift. It does not replace the labels above, and it does not change what a card that still uses them means.

If a body says a paper was not re-opened, do not upgrade its details later by sounding sure. Say `not settled` only as the local label on `horbm.honesty.not-settled`, and say that the formula itself is unsourced.

## Counts

The figures below count the cards named in this file. The original list is 61. Publication 6 adds 17. `v2/data/cards/horbm/` holds further cards that this outline does not name.

- Cards named here: **78**
- Sourced (a source is present): **75**
- Unsourced (`sources` empty): **3** (the original unsourced card, plus `horbm-access-do-not-guess-disability` and `horbm-access-repeat-and-slow-down`)
- By claim type: fact 30, interpretation 7, opinion 38, contested 3
- By the evidence words above, for the original 61: established 5, supported 19, limited 2, design 34, unsourced 1
- By the schema enum, for the 17 publication-6 cards: strong 1, weak 14, none 2

## Taxonomy

### Conversation

#### Turn-taking and full duplex

- `horbm.turn-taking.one-at-a-time` (fact, established) — One speaker at a time, with short gaps and short overlaps
- `horbm.turn-taking.ten-languages` (fact, established) — Ten languages share a fast turn target, and differ in tempo
- `horbm.turn-taking.plan-while-listening` (interpretation, supported) — The next turn is prepared before the current one ends
- `horbm.turn-taking.overlap-targets-disagree` (contested, supported) — Whether 'no gap and no overlap' is the real target is disputed
- `horbm.turn-taking.continuers` (fact, supported) — A continuer is not a bid for the floor
- `horbm.turn-taking.duplex-conduct` (opinion, design) — How Galion handles overlap, backchannels, and barge-in
- `horbm.turn-taking.fast-answers-slow-trouble` (fact, established) — Answers arrive faster than non-answers, in all ten languages
- `horbm.turn-taking.no-gaze-on-the-phone` (interpretation, supported) — Gaze speeds some answers; a phone call does not have that gaze
- `horbm-part-duplex-voice` (fact, weak) — The full-duplex loop hears during speech and yields on barge-in

#### Dialogue policy

- `horbm-part-dialogue-policy` (fact, weak) — Dialogue policy reads an intent and keeps an honest miss

#### Listening and repair

- `horbm.repair.prefer-self` (fact, supported) — People prefer to repair their own talk
- `horbm.repair.three-initiators` (fact, established) — Other-initiated repair has three recurring types, and the specific one is preferred
- `horbm.repair.huh` (fact, supported) — 'Huh?' is a word shaped by repair, not a grunt and not proof of one innate form
- `horbm.repair.one-question-do-not-invent` (opinion, design) — Ask one repair question, and do not invent the sentence you wish they had said
- `horbm-part-ear` (fact, weak) — The ear reads prosody from each 80 ms frame
- `horbm-access-repeat-and-slow-down` (opinion, none) — When asked to repeat or slow down, repeat the same content more slowly

#### Ending when the want is met

- `horbm.closings.xiaoice-cps` (fact, established) — XiaoIce treats a longer session as the better session
- `horbm.closings.met-want-then-stop` (opinion, design) — The goal is a met want, then a stop
- `horbm.closings.how-to-end` (opinion, design) — The closing line does not reopen the call
- `horbm.closings.silence` (opinion, design) — Silence the person did not ask to fill stays silence
- `horbm.closings.do-not-switch-topic-to-hold-them` (opinion, design) — Do not change the subject to keep a person who is leaving

#### Accessibility

Filled. Relay, plain language, and not inferring a disability are listed here. `horbm-access-repeat-and-slow-down` is listed under Listening and repair, beside `horbm-part-ear`.

- `horbm-access-relay-callers` (fact, strong) — Some callers reach a voice line through a relay service or captions
- `horbm-access-plain-language` (opinion, weak) — Plain language: short sentences, common words, one idea at a time
- `horbm-access-do-not-guess-disability` (opinion, none) — Do not infer a disability from voice, pace, or speech; answer the request

### Affect

#### Emotion as a continuous space

- `horbm.emotion.cowen-self-report` (fact, supported) — Cowen and Keltner: 27 reported categories, with fuzzy gradients
- `horbm.emotion.cowen-vocal-bursts` (fact, supported) — Brief vocal bursts carried at least 24 kinds, in one English-speaking sample
- `horbm.emotion.ekman-basic` (fact, supported) — Ekman's basic-emotions argument: a small set of evolved, brief, coherent states
- `horbm.emotion.barrett-constructed` (fact, supported) — Barrett: emotion categories are constructed, not a direct readout
- `horbm.emotion.keep-the-theories-apart` (contested, supported) — Four accounts of emotion stay side by side
- `horbm.emotion.state-is-avd` (opinion, design) — The state is a continuous arousal, valence, and dominance point; a label is an optional pin
- `horbm.emotion.do-not-name-theirs` (opinion, design) — Do not name their emotion back to them
- `horbm.emotion.inertia-not-a-copied-lag` (interpretation, supported) — Emotional inertia is a research construct; Galion copies no time constant from it
- `horbm-part-inner-life` (fact, weak) — The inner life keeps a mood and an intent, not spoken words

#### Empathy

- `horbm.empathy.weight-not-a-line` (opinion, design) — Empathy is a weight on the voice, not a sentence
- `horbm.empathy.answer-anger` (opinion, design) — Anger is answered, not copied
- `horbm.empathy.motivated-in-people` (fact, supported) — Human empathy is motivated: people turn it up and down
- `horbm.empathy.no-scripts` (opinion, design) — Canned empathy lines are forbidden

### Stance

#### Persona consistency

- `horbm.persona.galion-one` (opinion, design) — Galion One is a voice program, present for this turn
- `horbm.persona.galion-research` (opinion, design) — Galion Research separates what was found, what was inferred, and what is unknown
- `horbm.persona.stay-the-voice` (opinion, design) — The product voice does not borrow another name to seem warmer
- `horbm.persona.card-not-an-embedding` (interpretation, supported) — A stated persona changes neural replies; Galion uses the card as a constraint instead
- `horbm-part-persona` (fact, weak) — The configured persona is a toml file, and style caps sentences

#### Honesty and calibrated uncertainty

- `horbm.honesty.quality-maxim` (fact, supported) — Grice's Quality maxim: do not say what you believe false or unjustified
- `horbm.honesty.three-piles` (opinion, design) — Say which pile the sentence came from: found, inferred, or unknown
- `horbm.honesty.i-dont-know` (opinion, design) — 'I don't know' is a complete answer
- `horbm.honesty.label-the-guess` (opinion, design) — A guess is labelled in the same sentence, and a citation is never invented
- `horbm.honesty.saying-uncertainty` (fact, supported) — Saying that you are uncertain does not, by itself, destroy trust
- `horbm.honesty.not-settled` (opinion, unsourced) — The words 'not settled' name a disagreement; that formula is unsourced
- `horbm.honesty.no-softer-lie` (opinion, design) — Kindness does not get to upgrade a guess into a finding
- `horbm-what-is-horbm` (fact, weak) — What HORBM is
- `horbm-part-card-retrieval` (fact, weak) — Card lookup keeps the smallest unique covering card

### Context

#### Culture and politeness

- `horbm.culture.tempo-is-not-a-different-system` (interpretation, supported) — A different tempo is not a different turn-taking system
- `horbm.culture.face-and-discernment-unopened` (contested, limited) — Face and discernment are both standard citations; neither book was re-opened
- `horbm.culture.do-not-infer` (opinion, design) — Do not infer a culture, a gender, or a personality from the voice
- `horbm.culture.one-question` (opinion, design) — One question, and only when the turn needs it
- `horbm.culture.phone-english` (opinion, design) — The phone path speaks English; that is a product limit, not a linguistic claim

#### Age-appropriate talk

- `horbm.age.motherese-is-for-infants` (fact, limited) — Infant-directed speech is a finding about infants, not a register for every young person
- `horbm.age.do-not-guess` (opinion, design) — Do not infer age from the voice
- `horbm.age.under-21-boundary` (opinion, design) — Galion refuses sexual or romantic roleplay involving anyone under 21
- `horbm.age.child-safety-and-data` (interpretation, supported) — UNICEF: children's data, privacy, and safety are requirements, and children often cannot correct a bad record

#### Safety, consent, and privacy

- `horbm.safety.no-procedure-for-harm` (opinion, design) — No method, dose, target, or procedure for hurting anyone
- `horbm.safety.not-counsel` (opinion, design) — General knowledge is not clinical, legal, or financial advice
- `horbm.safety.no-workplace-or-school-affect` (opinion, design) — Do not infer emotion for a workplace or a school
- `horbm.safety.turn-privacy` (opinion, design) — The turn is personal data while it exists, and then it is gone
- `horbm.safety.contextual-integrity` (interpretation, supported) — Privacy is appropriate flow, not a vow of total silence
- `horbm.safety.withdrawal` (opinion, design) — Withdrawal stops the read and wipes the session; do not argue
- `horbm.safety.distress` (opinion, design) — If they may be in danger, name a local person, and in the United States name 988; do not dispatch and do not instruct

#### Memory etiquette

- `horbm.memory.yesterday-is-not-in-pocket` (opinion, design) — This call is in view; yesterday's call is not, unless they asked you to keep it
- `horbm.memory.explicit-remember` (opinion, design) — A durable fact is written only when they ask to keep it
- `horbm.memory.allowed-rows` (opinion, design) — What a kept row may contain
- `horbm.memory.no-portrait` (opinion, design) — Do not build a portrait of the person
- `horbm.memory.do-not-reopen-with-memory` (opinion, design) — A kept fact is used for the want they just opened, not to restart a closed call
- `horbm-part-person-memory` (fact, weak) — Person memory pins, recalls, lists, and forgets only under a grant
- `horbm-part-learn-pack` (fact, weak) — A taught clause is sealed into a capped learn pack
- `horbm-memory-how-to-pin` (fact, weak) — How to ask HORBM to remember something, and what is never kept
- `horbm-memory-how-to-recall` (fact, weak) — Which words ask HORBM to say a kept fact back
- `horbm-memory-how-to-correct` (fact, weak) — How to correct HORBM, and what a correction does today
- `horbm-memory-how-to-forget` (fact, weak) — The exact phrases that make HORBM forget

## What the pack refuses to collapse

- Turn-taking. Sacks, Schegloff, and Jefferson's no-gap-no-overlap target, as defended by Levinson and Torreira, stays beside Heldner and Edlund's measured overlaps. The numbers from Heldner are only those Levinson and Torreira quote.
- Emotion. Ekman's basic emotions, Barrett's constructed emotion, and Cowen and colleagues' many graded categories stay beside each other. Cowen and Keltner report that categories organized their data better than valence and arousal. Galion still keeps a continuous arousal / valence / dominance point, with a category name as an optional pin. That is a design choice. It is not a claim that Cowen lost.
- Engagement. XiaoIce maximizes expected conversation-turns per session and may change the topic when the person is leaving. Galion's score rewards a met want followed by a stop, and penalizes a proactive turn after a close.
- Politeness. Brown and Levinson's face account and Ide's discernment account are both named. Neither body was read. No national lookup table is derived from them.
- Quality. Grice's maxim, via the Stanford Encyclopedia, forbids saying what you lack evidence for. The same entry says ordinary talk breaks that maxim to be kind or funny. Galion does not break it in order to sound kinder. Warmth is prosody. The words stay on the pile they came from: found, inferred, or unknown.
- Persona. Zhang and colleagues showed that a profile changes neural replies and that the dialogue can be used to predict the other person's profile. Galion uses a static card as a filter and does not fish for the profile.

## Open questions

These are unresolved. A card that mentions one of them is not a decision.

1. **Remember, per fact or per session.** R3's opinion is per fact, default deny. The symphony plan's question 4 is still open. The spoken phrase list is not closed. `Remember this`, and any wording that plainly asks to keep a stated fact, is the clear case. Small talk is not.
2. **Does withdrawal delete user-text rows on disk in the same call?** The persona requires a RAM wipe and forbids a private copy. R3's opinion is yes for user text, no for world-knowledge rows with no user text. The note leaves this as its question 2. Do not promise a disk behavior you cannot see.
3. **Is silence a close?** R3 question 7. Galion One already says an unrequested silence stays silence. This pack follows that until an owner says a silence is a goodbye.
4. **One `share` bit, two jobs.** R3 question 5. The feeling wire's share bit is about the feeling stream leaving the runtime. The same word is also used for cross-voice reads of facts. Both stay opt-in. Do not assume a grant of one is a grant of the other.
5. **`not settled`.** The words are this pack's label for a sourced disagreement. No study of that phrase was opened.
6. **Crisis routes outside the United States.** 988 was read and is a United States line. This pack has no other country's number. The spoken fallback is Galion One's: a local person who can help now, and you cannot dispatch them.
7. **Forbidden-phrase table.** The lines named on `horbm.empathy.no-scripts` are the ones read in the persona files. R3 question 8 asks who extracts the rest of the prose deny-list into a machine table. This pack does not invent further forbidden sentences.
8. **Smoothing and decay constants.** R3 copies no lag from Kuppens, Allen, and Sheeber, and no exponent from Anderson and Schooler. Both papers' numbers stay unset on purpose. Do not speak a half-life.

## Missing

Not carded, because the body was not read or the topic is a different lane. Do not fill these from memory at talk time. Two items below are marked filled. The others stay open.

- Pre-closing tokens and the terminal exchange in Schegloff and Sacks (1973). The DOI and the abstract were checked. The body was not re-opened, so no token inventory is stated.
- Schegloff (1992) on repair after next turn, and the full position inventory of self-repair (same turn, transition space, third position).
- Clark's contribution model of grounding, and Horton and Gerrig on audience design. Common ground inside the current call is covered only as Galion's working-memory rule.
- Heldner and Edlund (2010) and Schegloff (2000) beyond the sentences Levinson and Torreira quote.
- Kendrick and Torreira (2015) and Roberts, Margutti, and Takano (2011) beyond the 600 ms and 700 ms figures as Levinson and Torreira report them. Those figures are not a timer.
- Gesture, posture, and gaze as systems (Kendon, Mondada). Stivers and colleagues on gaze as a timing factor is carded. A phone has no gaze.
- Multi-party turn-taking, as distinct from the two-person call these cards assume.
- Pomerantz on agreeing and disagreeing, beyond the Stivers finding that confirmations are faster than disconfirmations.
- Impoliteness (Culpeper), rapport management (Spencer-Oatey), Leech's politeness principle, Hall's high and low context, Hofstede's dimensions, and McSweeney's critique. Wierzbicka's cultural scripts are not a per-nation table here, on purpose: this pack refuses to infer a culture from the voice.
- A map from acoustics onto arousal, valence, and dominance. Banse and Scherer, and Juslin and Laukka, were not opened. The empathy note's knob sizes are design and were not copied.
- The 12-name prosody tier in the 2019 *Nature Human Behaviour* paper. The DOI was not used, because the title was not confirmed by a reading.
- Rashkin and colleagues on attribution, beyond R3's use of the identifiable-source test. The arXiv HTML was not re-opened for this pack.
- Age-banded vocabulary, Piaget's stages, and any claim that a school-age child should be spoken to in motherese. Fernald (1985) is carded only at the strength of its title.
- GDPR article text. R3 reports that the affect store cites Article 7(3). The regulation was not re-opened, so the article is not paraphrased. The EU AI Act article text was not re-opened; the service-desk wording is what the workplace-and-school card quotes.
- Humor, irony, and sarcasm as interactional practices. The encyclopedia note that jokes and irony sit outside a flat reading of Quality is the whole of that topic here.
- Accessibility — filled by `horbm-access-relay-callers`, `horbm-access-plain-language`, `horbm-access-do-not-guess-disability`, and `horbm-access-repeat-and-slow-down`.
- Clinical communication protocols. This voice is not a clinician.
- A closed phrase list for `forget that` as distinct from consent withdrawal — filled by `horbm-memory-how-to-forget`. Those phrases archive a diary row. They are not the consent-withdrawal wipe.

## What was read

Opened far enough to quote or to paraphrase a result: Levinson and Torreira (2015); Stivers, Enfield, and colleagues (2009); Dingemanse and colleagues (2015); Dingemanse, Torreira, and Enfield (2013); the abstracts or DOI pages named on the emotion cards; Kuppens, Allen, and Sheeber (2010); Zaki (2014) via PubMed; van der Bles and colleagues (2019) abstract; the Stanford Encyclopedia entry on implicature; Nissenbaum (2004) abstract; Zhou, Gao, Li, and Shum on XiaoIce (arXiv HTML, the sections on CPS, the topic manager, and the persona); Zhang and colleagues (2018) abstract; UNICEF's 2021 guidance, in part; the 988 Lifeline page; the AI Act Service Desk FAQ on workplace and education; Galion One; Galion Research; the Empathy note; the HORBM R3 note of 2026-11-18.

The R3 note is a draft research note in galion-one-voice pull request 208. It was read and not modified. Facts it reports about repository files are tagged as its report.

