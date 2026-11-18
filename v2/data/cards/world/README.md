# World knowledge cards

Base world knowledge for HORBM, Galion's retrieval brain, and Galion Research.
One retrieval-sized card per file. This directory is the world section of the
pack. It does not deploy anything.

Copyright (c) 2026 Galion Labs. MIT License. See `LICENSE`.

The texts these cards cite stay with their authors and publishers. The MIT
grant covers this compilation: the card files, the summaries, and this note.

## Shape

S1 had not published `v2/data/schema/card.schema.json` when these cards were
written. The fields follow the swarm contract the memory parser already
accepts (`knowledge-card/2`):

| Field | Use |
| --- | --- |
| `schema_version` | `knowledge-card/2` |
| `id`, `slug` | `world.<slug>`, file `<slug>.json` |
| `section` | always `world` |
| `category` | retrieval bucket (physics, history, climate, …) |
| `title`, `summary`, `body` | the thing to retrieve. Summary is the gist. |
| `claim_type` | `fact`, `interpretation`, `opinion`, or `contested` |
| `sources[]` | `title`, `url`, `author`, `date`, `accessed`, optional `note` |
| `evidence_strength` | `none`, `weak`, `moderate`, `strong` |
| `said_by` | who made the claim |
| `as_of_date` | when it was said, or the data vintage. Empty if unsourced. |
| `status` | `sourced - needs review` or `unsourced - needs review` |
| `contested_views[]` | `{label, summary, sources?}` kept side by side |
| `related[]` | other card ids |
| `tags` | optional |
| `read_time_min` | about 220 words a minute, minimum 1 |
| `legacy` | which v1 article the card came from. The old truth scores and source counts are not evidence and are not copied. |

`status` is never `published`. A human still has to review every card.
Extra keys are ignored by the current memory parser. Every `*.json` file in
this directory is a card.

## Editorial rules

These are hard rules. A later editor does not get to soften them because a
paragraph would read more smoothly without them.

1. **One claim cluster per card.** Small enough to retrieve. A lecture is not a card.
2. **Every claim keeps its source, its date, and who said it.** `said_by` is the speaker or the institution. `as_of_date` is when they said it or the vintage of the data. `accessed` is when this pack opened the page (2026-11-18 unless a card says otherwise).
3. **Only real, verifiable sources.** Prefer primary sources: the paper, the statute, the treaty, the dataset, the speech. A DOI was checked in Crossref, or a URL was opened, before it was written down. A textbook or an encyclopedia is allowed when it is named as a secondary source and the evidence is marked moderate.
4. **Never invent a citation or a URL.** If a claim cannot be tied to a page that was actually opened, `sources` is `[]`, `evidence_strength` is `none`, `as_of_date` is empty, and `status` is `unsourced - needs review`. An empty source is an honest card. A made-up source is a broken memory.
5. **Separate fact, interpretation, opinion, and contested claims.** A document's existence is a fact. A period label ("the Renaissance", "the scientific revolution") is an interpretation. A policy recommendation is an opinion. A live disagreement is `contested`, with the sides in `contested_views`.
6. **Weigh evidence. Do not false-balance.** A range, a denominator, and a method stay in the card. Cook et al. 2013 is stored with its denominator (abstracts that took a position), not as "97 percent of scientists." NASA's attribution statement is a different kind of source and is not averaged into that percentage.
7. **Not settled is an allowed conclusion.** Hubble tension, the particle identity of dark matter, the cause of accelerating expansion, the origin of life, free will, and the continuum hypothesis are stored as open. Do not close them for the sake of a clean sentence.
8. **History from more than one side.** Record the document, then the disagreement about what it means. The Holocaust figure used here is the United States Holocaust Memorial Museum's, and denial is not given equal space. The Armenian killings are stored with the museum's range and with the Turkish foreign ministry's "controversy" framing, and the ministry's argument is not invented past what the page yielded. Resolution 181 and UNRWA are stored as UN texts, not as a national narrative. Casualty totals that were not opened (the v1 "70 to 85 million" for the Second World War, a Rwandan toll, slave-voyage totals) stay unsourced.
9. **No propaganda in either direction.** Do not write a victor's catechism, and do not write a mirror-image catechism. Name empires, slavery, famine, and conquest when a source supports the sentence. Do not decorate the sentence with a moral the source did not state.
10. **Numbers that move carry their vintage.** Temperatures, CO₂, poverty counts, and moon counts are dated. A round number from the v1 articles ("12 decimal places", "86 billion neurons", "45 percent of countries") is unsourced unless the page that states it was read.
11. **No secrets and no IP addresses.** Nothing in this directory is a credential, a private host, or an internal address.
12. **Quotes stay short.** Copyrighted books are paraphrased and cited. A statute or a treaty can be identified by the clause that was actually on the page.

## What this pass holds

200 cards. **162 sourced - needs review. 38 unsourced - needs review.**

All 40 v1 articles in `src/lib/knowledge-data.ts` are represented. Where a v1 sentence had a real source, it became a small card. Where it did not, it became an explicit unsourced card instead of a fake citation. v1 `truthScore` and source counts were discarded.

Claim types: 138 fact, 43 interpretation, 14 contested, 5 opinion.

Sourced anchors include Einstein 1905 and 1916, Planck 1901, Schrödinger 1926, Heisenberg 1927, Bell 1964, Aspect 1982, LIGO 2016, the Event Horizon Telescope papers, Maxwell 1865, Noether's translated 1918 paper, Shannon 1948, the 2019 SI, NASA on seasons, sky, Moon phases, and the solar system, USGS on water, plates, and the age of the Earth, NOAA on tides, CO₂, temperature, and ocean acidification, NIST on the second and the metre, Darwin 1859, the 1953 DNA papers (Watson and Crick, Franklin and Gosling, Wilkins), Avery 1944, the human genome papers of 2001 and 2022, Tiktaalik, Jebel Irhoud, Neanderthal and Denisovan genomes, the UDHR, the Genocide Convention, the Declaration of Independence, the French declaration of 1789, emancipation and the Thirteenth and Nineteenth Amendments, the UK Slavery Abolition Act 1833, the invasion of Poland, Pearl Harbor, Hiroshima and Nagasaki, the USHMM Holocaust account, the Treaty of Versailles, the Treaty of Nanking, Resolution 181, Truman 1947, the Gutenberg Bible at the Library of Congress, Newton's Principia, the Royal Society's own dates, Smith, Marx's Gotha line and the Manifesto, Nash 1950, Tversky and Kahneman, Turing 1950, and the Stanford Encyclopedia entries used as labeled secondary maps.

## Coverage outline

This is what the world pack should eventually hold. This pass is a seed, not the shelf.

### 1. Physical law

Motion, forces, energy, momentum, and the symmetries behind conservation laws. Special and general relativity, with each test named (clocks, light bending, gravitational waves, GPS) rather than a precision slogan. Quantum theory as a formalism, the experiments (diffraction, Bell tests), and the interpretations kept apart. Thermodynamics and statistical mechanics, including the "almost always" in the second law. The Standard Model, the Higgs results, and the open problems: quantum gravity, neutrino masses, dark matter's identity, the cause of accelerating expansion, the Hubble tension.

### 2. Matter, light, and measurement

Electromagnetism, optics, the defined constants of the SI, and how a measurement carries an uncertainty. Chemistry: atoms, the periodic table, bonds, water as a solvent, radioactivity. The difference between a defined constant (the speed of light in the metre) and a measured one.

### 3. The Earth system

Deep time and radiometric dating. Plate tectonics, earthquakes, volcanoes, the rock cycle. Oceans, tides, the water cycle, with residence times only when a dataset states them. Atmosphere and climate as separate layers: the greenhouse mechanism, the instrumental temperature record with its baseline, the CO₂ record, attribution, ocean acidification, impacts, and only then policy, which is opinion. Maps, projections, and the prime meridian as a convention.

### 4. Life

Cell, metabolism, photosynthesis (and where the oxygen comes from), genetics, the genetic code and its exceptions, development. Evolution as a body of evidence, each line sourced, not as a cheer. Ecology, including ecosystems that do not start from sunlight. The origin of life as unsolved. Microbiology: bacteria, archaea, viruses as different things. Immunity, vaccines as a described mechanism, disease by disease. The brain by region and by counted cells, not by the slogan "most complex."

### 5. Human origins and prehistory

Fossil and ancient-DNA evidence, with dates that are still argued (Jebel Irhoud, Madjedbebe, and others). Out of Africa and later admixture with Neanderthals and Denisovans, percentages only from a table that was read. Independent origins of farming, writing, and numerals. Peopling of the Americas, Sahul, and the Pacific from archaeology, not from a European "discovery" clock.

### 6. History by place, not by the winner's syllabus

Africa, the Americas, Asia, Europe, Oceania, and the Arctic, in each period that has a record. Empires and the people they ruled. The Islamic, Indian, and Chinese contributions to science and philosophy, without inventing a single House of Wisdom. Print in East Asia before Mainz, and Mainz on its own evidence. Wars as documents and as contested causes. Famines, partitions, and mass killings with the range of serious estimates and the definition each estimate uses. Slavery on every major route, with voyage data rather than a round number. Labor, women, and enslaved people inside the chronology, not as an appendix. Decolonization as several histories.

Genocides and mass atrocities are in scope. The legal definition (intent, protected group, named acts) stays next to the historical evidence. A state's objection to a legal name is recorded when the state publishes it. It does not erase a documented death range, and it is not inflated into a second history of equal weight.

### 7. Institutions

States, constitutions, treaties, and courts as texts. Money as a documented institution (coin, credit, fiat) with the theories labeled as theories. Prices as a model with stated assumptions, plus the cases that model fails. Democracy as a family of institutions with different franchises, not as a percentage pulled from an unread index.

### 8. Ideas, stored as someone's ideas

Philosophy and religion as attributed claims: who said it, in which text, and what is later commentary. Stoicism, Buddhist canons, social-contract theories, virtue, duty, and consequence are maps of disagreement. They are not a moral fact with a truth score.

### 9. Knowledge about knowledge

What a method is and is not. Peer review as a filter, not a proof. Replication, p-values, and publication bias. Cognitive biases tied to the paper that demonstrated them, with later critiques beside the original. Fallacies as warnings, not as a substitute for the argument.

### 10. How ordinary things work

Seasons, tides, phases, eclipses, sky color, lightning, why ice floats, how infection differs from a genetic disease, how a vaccine is unlike an antibiotic, how a transistor and a packet network work. Everyday cards earn their place by correcting a widespread false picture, and by naming the source of the correction.

## Out of scope for a card

A card is not a ranking of civilizations, not a party platform, and not a secret. If a sentence needs an invented URL to sound sourced, it does not go in.
