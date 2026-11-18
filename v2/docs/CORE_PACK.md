# Core pack

The base world pack is the small set of sourced cards a person needs before the shards. One card is one claim. A shard is everything that can wait: a catalogue row, a local statute, a single paper that does not change the picture.

Sections below are filled by the agent that owns that area. Each section counts only the cards that agent added. This file's first section is physics, constants and SI, matter and energy, chemistry, and astronomy and cosmology. A host the truth gate does not classify has a ceiling of `weak`. The label on those cards is that ceiling. The quotation is still the page that was opened.

## Physics, constants and SI, matter and energy, chemistry, astronomy and cosmology

128 new cards, all with a source URL opened on 2026-11-18. 112 are `strong`, 15 are `weak`, 1 is `moderate`. 127 are `fact`. 1 is `interpretation`. Two older cards were extended, not replaced: the Sun fact sheet now points at the spectral type and luminosity rows, and the unsourced Big Bang timeline card now points at the Planck age card. The v1 timeline numerals stay unsourced.

Ids use `world.constants.`, `world.physics.`, `world.matter.`, `world.chemistry.`, `world.astronomy.`, and `world.cosmology.`. Each new card is tagged `core-pack` and `area:<name>`.

| Area | Cards | What is in this batch | Still open |
| --- | ---: | --- | --- |
| Constants and SI | 19 | The 2019 definitions of the kilogram, ampere, kelvin, mole, and candela, with the exact constants. Celsius offset. Hertz versus becquerel. The 24 SI prefixes, including the deka/deca spelling. Conventional exact pressures (101 325 Pa and 100 000 Pa), the electronvolt, the faraday, Josephson, von Klitzing, flux quantum, conductance quantum, reduced Planck constant, and the atomic mass constant. | The second and the metre were already carded. Positive exponents in the BIPM derived-unit table were not copied: the PDF text collapses them. |
| Physics | 43 | 2022 CODATA values for G, the fine-structure constant, particle masses and rest energies, the Rydberg constant and the 13.6 eV row, the Bohr radius, the Compton wavelength, electron and muon g factors and anomalies, magnetons, the Fermi coupling, the weak mixing angle as printed, deuteron and alpha masses, and the four Planck scales. Eleven IAEA Live Chart half-lives. | The half-life cards are `weak`. `iaea.org` is not an official or dataset host in the truth gate, and no second host was opened. The proton-radius puzzle and the muon g−2 theory-versus-experiment papers were not opened; those cards are the CODATA row only. Most specialist CODATA rows (helion, shielded moments, atomic units) stay in the shard. |
| Matter and energy | 7 | Molar gas constant, Stefan-Boltzmann constant, Wien displacement constant, second radiation constant, the two ideal-gas molar volumes (100 kPa and 101.325 kPa), and the molar mass constant, which the 2022 listing does not mark as exactly 1 g/mol. | A full thermochemical table, real-gas corrections, and phase-boundary data beyond NIST's "about 100 °C" boiling sentence. |
| Chemistry | 39 | NIST Chemistry WebBook identity for 35 common substances and elements: formula, catalog molecular weight, monoisotopic mass, CAS, InChI. Four stable-isotope abundances from the IAEA Live Chart (1H, 4He, 12C, 56Fe), labeled `weak` for the same host reason. | CIAAW interval atomic weights were not opened. The WebBook weight is one catalog number, not an interval. The rest of the periodic table and named reactions stay in the shard. |
| Astronomy | 12 | NASA fact-sheet bulk numbers for Mercury, Venus, the Moon, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto, dated on each sheet. Sun spectral type G2 V, luminosity 382.8 × 10^24 J/s, and the printed sidereal rotation period. | The IAU 2006 planet-resolution URLs returned 404, so Pluto's classification is not re-argued here. An exoplanet census page did not expose a stable total. Moon counts on the giant-planet sheets are the counts printed on that date. |
| Cosmology | 8 | From the Planck 2018 parameters manuscript (arXiv:1807.06209v4, 9 August 2021): baseline age 13.797 ± 0.023 Gyr and the 13.8 billion year rounding; ΩΛ; σ8; ΩK with BAO; the tensor-to-scalar limit with BICEP-Keck 2015; the abstract's Ωc h², Ωb h², ns, and τ; and the collaboration's statement that inflation, dark energy, and dark matter are not understood at a fundamental level (`interpretation`, `moderate`). Fixsen's 2009 abstract gives CMB temperatures 2.72548 ± 0.00057 K and 2.7260 ± 0.0013 K. | These Planck cards rest on one preprint. H0 and Ωm were already on the big-bang card and were not copied again. |

### Left to shards on purpose

Element-by-element spectral lines, the full nuclide chart, every CODATA derived constant, per-planet atmospheric composition tables beyond the Venus and Mars pressures named above, and exoplanet rows. Earth, climate, life, health, and history are other sections of this file.

### Adding another card in this section

Open the page. One claim. Put the URL you opened in `sources`, with author, date, and `accessed`. Do not label the card above the truth-gate ceiling for that host. `iaea.org` currently ceilings at `weak`. NIST, BIPM, NASA, and arXiv can carry `strong` when the claim is the row or the sentence that was read. Tag `core-pack` and `area:` with one of `constants`, `physics`, `matter`, `chemistry`, `astronomy`, `cosmology`.

## History and religions

235 new cards in `v2/data/cards/world/`. 191 are `history`. 44 are `religion`. Every card is one claim. Every card has at least one source URL that was opened on 18 November 2026. 235 of 235 are sourced. No card file that already existed was rewritten, and `src/` was not touched.

The batch is primary documents and what those documents say. A fact card quotes the page. An interpretation card says the page is a later summary. A contested card puts the opened texts side by side and does not pick a winner. Where a host is not on the truth gate's primary-text or official list, the evidence label is `weak` even when the quotation is the document's own wording. That is the gate's ceiling. The label was not raised by editing the gate.

### Counts

| | |
| --- | ---: |
| Cards added | 235 |
| With a real source URL | 235 (100%) |
| `fact` | 220 |
| `contested` | 7 |
| `interpretation` | 4 |
| `opinion` | 4 |
| Evidence `strong` | 132 |
| Evidence `moderate` | 2 |
| Evidence `weak` | 101 |

`strong` is Avalon Project transcriptions (`avalon.law.yale.edu`, class `primary_text`). `moderate` is two Avalon pages whose useful sentence is the editor's frame around the extracts (Anglo-Saxon laws; the Adrian IV bull). `weak` is Fordham Internet History Sourcebooks (77 source rows), Bible Gateway RSV (17), the Al Quran Cloud API for the Uthmani text and the Sahih International translation (13), and one Internet Archive copy of a Rig Veda selection (1). Those hosts are class `other` in `v2/tools/truth-gate/truth-gate.toml`. Their ceiling is `weak`.

Source rows by host: Avalon 136, Fordham 77, Bible Gateway 17, Al Quran Cloud 13, Internet Archive 1. Nine cards cite a second page that was also opened (the contested sets, and a few treaties read against each other).

Date on the card is the document date when the page states one. Fifty cards leave `as_of_date` empty because the page does not give a composition year that this batch was willing to assert (most of them are scripture). `said_by` is filled on all 235.

By the year field, where it is filled: ancient through 500 (6), medieval 500–1499 (19), early modern 1500–1799 (37), nineteenth century (33), twentieth century (89), twenty-first century (1). The undated field is mostly scripture and a few classical texts.

### What the batch covers

Religions, from a named translation or selection, not from a reference encyclopedia: the RSV of the Shema, the Decalogue, Genesis 1, Micah 6, Amos 5, Isaiah 2, the beatitudes, Matthew 28, John 1, 1 Corinthians 15, the Samaritan story, Acts 17, Galatians 3, and James 2; Sahih International of Quran 1, 2:177, 2:183, 2:255, 2:256, 3:104, 4:135, 5:32, 9:5, 49:13, and 112, plus a second English of surah 1 on Fordham; a Fordham hadith selection and a Bukhari fasting selection; Maimonides' thirteen principles as that page presents them; Arnold's Bhagavad Gita; the Laws of Manu; a Rig Veda creation hymn; an Ashokan edict; Fordham's life-of-the-Buddha compilation, labeled as a compilation; Ghazali; Rumi; a page on ancestor rites; a temple inscription on the deification of Lao Zi. James and Galatians are left side by side. Quran 2:256 and 9:5 are left side by side. Neither pair is resolved.

History is the wording of treaties, laws, letters, and eyewitness pages. Regions that have at least one card include Mesopotamia, Rome, the eastern Mediterranean, Persia, Frankish and English medieval law, Scotland, Ireland, Iberia, West and North Africa, the Ottoman and Arab east, South Asia, China, Japan, Korea, Vietnam, Mexico, the Andes, the United States and the Native nations named in the treaties that were opened, and the twentieth-century alliances. Contested sets that use two or three opened documents, without a verdict: Cortes and a Nahuatl-tradition account of the meeting with Motecuhzoma; McMahon, Sykes-Picot, and Balfour; South Carolina's nullification ordinance and Jackson's proclamation; Gromyko and the UN Korea commission; the 1954 Geneva declaration, de Gaulle in 1964, and the February 1965 State Department paper.

### Open gaps

These texts were not opened, so they are not in the batch. Gallica and Europeana returned 403. Perseus returned 403 ("outdated browser"). A Library of Congress item returned 403. sacred-texts.com returned 403. Project Gutenberg returned 503. The Internet Archive returned 429 for the Dhammapada and Lotus Sutra copies that Fordham links. The Hammurabi frame page is only a frameset; the laws used here are the King translation at `hamcode.asp`.

Not covered, because a usable text was not in hand: the Guru Granth, a Jain scripture, the Gathas, the Kojiki, the Daodejing itself (only a later deification inscription), the Poetic Edda, and the Book of the Dead. The Analects and the four noble truths already had cards; they were not repeated. Oceania in this batch is the ANZUS treaty, not a Maori or Aboriginal document. The Spartacist committee's January 1919 sentence is on Avalon, but the quote extractor kept hitting the page chrome, so that card was not written rather than padded.

Fordham, Bible Gateway, and Al Quran Cloud could be added to the gate's `primary_text` class later, if someone checks that those hosts are transcriptions and not mirrors. This batch does not change that config. Until then their cards stay `weak`.

A second independent copy was not opened for most single-document claims. The gate will warn `strong_single_source` on those Avalon cards. The claim in each case is what that one transcription says. A second transcription would clear the warning. It was not invented.

## Mathematics, evidence, money, law, and technology

214 cards, ids `world.core.*`, added from primary texts and official pages opened on 18 November 2026.

| Area | Cards | What they are |
| --- | ---: | --- |
| Power, law, and courts | 128 | Operative sentences from constitutions and basic laws, the UN Charter, the Rome Statute, the European Convention, and U.S. judicial and Senate procedure. English compilations from constituteproject.org are labeled `weak` because that host is not in the gate's stronger classes. U.S. National Archives, Justice Laws Canada, and un.org stay `strong`. |
| Technology, energy, and measurement | 38 | RFC sentences, Unicode, IANA, FIPS 197, floating-point rounding, the end-to-end argument, the CAP tradeoff, EIA energy units, and the NRC's statement of which power-reactor types are in commercial operation in the United States. |
| Money, prices, tax, and trade | 34 | Federal Reserve Act section 2A beside the FOMC's 2 percent PCE goal, ECB HICP, Bank of Canada CPI, Riksbank CPIF, Swiss National Bank strategy, Bank of Japan CPI target, Basel III's minimums, WTO and GATT most-favoured-nation text, BEA's real and nominal GDP and its three quarterly estimates, FDIC insurance limits, a zero reserve-requirement ratio, IRS 2025 brackets, and one Card and Krueger fast-food estimate kept as contested. |
| How a claim is weighed | 11 | GUM definitions of uncertainty, Aristotle's account of reasoning and of apparent refutation, soundness in the open textbook *forall x*, the CONSORT reporting guideline, and the GRADE distinction between certainty and recommendation strength. |
| Mathematics | 3 | Euclid I.47 as an equality of squares, the Clay statement of P versus NP, and OpenStax's definition of the derivative as a limit. |

Every card has a source URL. Evidence on these 214 cards: 92 `strong`, 4 `moderate`, 118 `weak`. Claim types: 212 `fact`, 1 `interpretation` (the 2 percent targets are not one index), 1 `contested` (Card and Krueger 1993, with the negative-employment prediction as that paper describes it).

Not in this batch, because the page was not opened: the German Basic Law, an IMF fact sheet, the BLS handbook, and a clean copy of the Bradford Hill lecture. Those claims were not filled in from memory.

`src/` was not changed.
