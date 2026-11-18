# Base World Core Pack

Perpetual Open MIT License. Copyright (c) 2026 Galion Labs.

This file is the map of core knowledge for knowledge.galion.app. Three sections are filled. Physics, constants and SI, matter and energy, chemistry, and astronomy and cosmology are one. Mathematics, evidence, money, law, and technology are another, merged from master. Earth systems, climate, nature and ecology, biology, the body, and health are the section from this branch. History and religion are not filled here.

The whole core pack is aimed at about 50,000 to 200,000 cards. That band is the owner's target for the core, not a count of cards that exist. Counts below that are labeled **estimates**. The first tranche in this pull request is 133 cards. It is a start, not the section.

The base world pack is the small set of sourced cards a person needs before the shards. One card is one claim. A shard is everything that can wait: a catalogue row, a local statute, a single paper that does not change the picture.

A host the truth gate does not classify has a ceiling of `weak`. The label on those cards is that ceiling. The quotation is still the page that was opened.


## How a card sits in the stack

`v2/docs/MEMORY_STACK.md` on the memory-crate branch describes a core file that is searched before any shard. In that design, cards with `claim_type` fact or `evidence_strength` strong are the core tier. Shards are immutable files split by section and category. This section uses the same split:

- A card is **core** when a person needs it to understand how the Earth system, a living system, a body, or a basic health measurement works, at the level of a mechanism, a definition, or one measured quantity with its date and its source.
- A card is a **shard** when it is a row in a long table: one earthquake, one weather station, one species account, one gene, one drug label, one national guideline, one trial. Those rows use the same schema. They are not promoted into the core just because a paper exists.

Cards in this tranche are tagged `core-pack`. They live in `v2/data/cards/world/` and follow `v2/data/SCHEMA.md`. One card is one claim. A fact is not written as an opinion. Where a page itself prints two counts, both counts are kept.

Sources for this tranche were opened on 18 November 2026. They are agency pages, the IPCC Working Group I Summary for Policymakers PDF, the Convention on Biological Diversity's own Article 2, Nobel Prize API motivation lines, and OpenAlex records of paper abstracts. Wikipedia was not used.

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

Element-by-element spectral lines, the full nuclide chart, every CODATA derived constant, per-planet atmospheric composition tables beyond the Venus and Mars pressures named above, and exoplanet rows. Earth, climate, life, health, mathematics, evidence, money, law, and technology are other sections of this file. History and religion are not filled here.

### Adding another card in this section

Open the page. One claim. Put the URL you opened in `sources`, with author, date, and `accessed`. Do not label the card above the truth-gate ceiling for that host. `iaea.org` currently ceilings at `weak`. NIST, BIPM, NASA, and arXiv can carry `strong` when the claim is the row or the sentence that was read. Tag `core-pack` and `area:` with one of `constants`, `physics`, `matter`, `chemistry`, `astronomy`, `cosmology`.

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

## Earth systems

**Core, estimate 6,000.** How the planet is built and how its large parts move and store water and air: crust, mantle, core, lithosphere, oceans as one body, depth, earthquakes as magnitude and intensity, groundwater, the nitrogen that organisms can actually use. Each card is one quantity or one mechanism, with the edition of the source.

**Shard, not core.** Earthquake catalogs, stream gauges, well logs, mineral assays, soil maps, bathymetry grids, and local geologic maps. The core keeps the scale and the mechanism. The shard keeps the rows.

**This tranche, 32 cards.** USGS interior pages for the shells, crust thickness, the Mohorovičić discontinuity, about twelve plates, and the lithosphere. The March 2007 Geologic Names Committee fact sheet for what a geologic time scale is, and for the still-open choice it records between a Quaternary base near 1.8 million years and one near 2.6 million years. A 2008 USGS page for reading rock ages from parent and daughter isotopes. NASA's Earth Fact Sheet for core radius, atmosphere and hydrosphere mass, scale height, albedo, black-body temperature, the magnetic-field table, topographic range, escape velocity, solar irradiance, and the moment-of-inertia factor. NOAA for one ocean, the Southern Ocean boundary, 71 percent coverage (kept distinct from the USGS 75 percent liquid-and-frozen figure already on the water-cycle card), mean depth, and Challenger Deep. USGS for magnitude versus intensity, moment magnitude, the Richter scale's present use, energy, the Modified Mercalli scale, groundwater, and the volcano counts the same USGS site does not reconcile.

**Not in this tranche, still core.** A full rock cycle, soil formation, and the biological steps of nitrogen fixation. Those need pages that state them. They were not invented here. The 2007 time-scale card is the USGS naming sheet of that date. It is not a claim that every later chart uses the same boundaries.

## Climate

**Core, estimate 4,000.** The measured gases, the assessed ranges, and the definitions used to decide that an El Niño is occurring. A global mean needs a year and a method. A later monthly mean does not replace an earlier annual mean.

**Shard, not core.** Daily station series, model output, downscaled projections, and forecast discussions.

**This tranche, 21 cards.** NOAA's ENSO definition and the Niño-3.4 thresholds. NOAA sea level since 1880, the 2023 satellite mean, and the 2006–2015 rate. NOAA methane for June 2026, marked preliminary on the page, and the Mauna Loa monthly mean for September 2026, which is not the 2024 global annual average already stored. NOAA's pre-industrial 280 ppm, the ice-core ceiling of 300 ppm, the pace of the recent rise, carbon dioxide's share of heating influence since 1990, and NOAA's greenhouse wording. IPCC Working Group I (2021) for the 2019 concentrations, the 56 percent land-and-ocean uptake, the two-million-year CO2 comparison, the percentage increases since 1750, the 3,000-year sea-level comparison, Arctic sea ice and glaciers, the equilibrium-climate-sensitivity interval the headline page had left off, and the 2019 radiative forcing.

The headline sentence that human influence has warmed the atmosphere, ocean, and land is already on `world.nature.climate-change`. It is not repeated. The new sensitivity card is the Summary for Policymakers interval that the older card said it would not invent.

**Not in this tranche, still core.** A full account of aerosols, ocean heat content as its own series, and paleoclimate proxies other than the ice-core CO2 ceiling above.

## Nature and ecology

**Core, estimate 6,000.** What an ecosystem is made of and how energy and nutrients move, at the level of a definition or one demonstrated interaction. Diversity within species, between species, and of ecosystems, as the Convention on Biological Diversity defines it. Predation where a named study reports what happened when predators were removed. A proposed planetary boundary stays marked as the authors' framework.

**Shard, not core.** Species accounts, local floras and faunas, protected-area inventories, and plot-level surveys.

**This tranche, 11 cards.** Article 2's definition of biological diversity. The evidence label on that card is weak because the gate classes `cbd.int` as an unlisted host. The claim text was not changed. FAO's FRA 2020 page for 4.06 billion hectares of forest and for the five-country share. That host is also unlisted, so those two cards are weak. Paine's 1966 abstract on predators and rocky-intertidal diversity. The 2015 planetary-boundaries paper, as a framework, not as a measurement that a boundary was crossed. NOAA on corals as animals, polyps and limestone, zooxanthellae, and bleaching. USGS on fixed nitrogen versus nitrogen gas, and on nutrient excess in water, including the United States atmospheric-deposition figure the page states.

**Not in this tranche, still core.** Succession and island biogeography. A later FRA page, not the 2020 interactive page, was the one that described reporting without a hectare total. The 2020 interactive page did state 4.06 billion hectares, and that figure is now a card.

## Biology

**Core, estimate 10,000.** Mechanisms of cells, inheritance, metabolism, and the large divisions of life, each as one claim tied to a paper or a prize citation. A proposal is labeled a proposal. A prize motivation is the sentence the Nobel record prints, not a textbook chapter added around it.

**Shard, not core.** Gene catalogs, protein structures one by one, pathway databases, and organism monographs.

**This tranche, 12 cards.** Woese, Kandler, and Wheelis (1990) proposing three domains. OpenStax Biology 2e for the cell cycle, for mitosis as nuclear division, and for meiosis as one replication followed by two divisions. Those three are moderate because OpenStax is a textbook in the gate's secondary class. Beadle and Tatum (1941) on genes and specific reactions; the abstract that was read does not use the later phrase "one gene, one enzyme," so the card does not either. Nobel citations for the citric acid cycle, coenzyme A, genetic control of enzyme and virus synthesis, mobile genetic elements, the chromosome in heredity, prions, and tumour viruses and the cell's genetic material.

DNA structure, the genetic code, natural selection, photosynthesis, and the 46-chromosome count are already in the pack and were not rewritten.

**Not in this tranche, still core.** Membranes, and the experimental result of the Meselson–Stahl paper. The OpenAlex abstract stated the question and not the result. PNAS, PMC, and Europe PMC did not return the paper text on 18 November 2026. The result was not written from memory.

## The human body

**Core, estimate 5,000.** How the body's major systems are described by a primary citation or a definition: blood, nerves, digestion, immunity, oxygen-carrying haemoglobin. Anatomy that has not been opened is not filled in.

**Shard, not core.** Regional anatomy, surgical technique, and imaging atlases.

**This tranche, 10 cards.** Nobel citations for human blood groups (1930), the structure of the nervous system (1906), the physiology of digestion (1904), and work on immunity (1908). NHLBI, last updated 24 March 2022, for the heart as a pump and for gas exchange in the lungs. OpenStax Anatomy and Physiology 2e for four chambers and for alveoli. The OpenStax cards are moderate. The NHLBI cards are strong. The 1904 motivation that was read is about digestion. It does not mention conditioned reflexes, and the card does not move the prize onto that subject. WHO's definition of anaemia, too little haemoglobin to carry oxygen, is with the health cards because the same sheet carries the prevalence estimates.

**Not in this tranche, still core.** Kidney filtration. A National Library of Medicine textbook page returned a browser check instead of the text. Heart chambers and lung gas exchange are now carded from NHLBI and OpenStax.

## Health basics

**Core, estimate 6,000.** What a disease is, in an agency's words, and the agency's own burden estimate with its year. A 2022 estimate and a 2024 estimate of a similar population are two cards when both were printed. They are not averaged. Cause-of-death totals are estimates on top of incomplete registration. The registration limit is itself a core card.

**Shard, not core.** Drug labels, national treatment guidelines, trial registries, and the full ICD code list.

**This tranche, 47 cards.** WHO Global Health Estimates for 2023 causes of death, including the note that registration is often incomplete and that ICD-11 is the classification. Malaria, tuberculosis, cardiovascular disease, drinking water, sanitation, diabetes, obesity, child undernutrition, tobacco, HIV, hypertension, cancer, air pollution, maternal mortality, road deaths, mental disorders, and under-five mortality, each from the fact sheet that was opened, with that sheet's date. WHO's 26 January 2026 healthy-diet sheet for principles, salt, free sugars, fat, and fruit and vegetables. Nobel citations for tuberculosis (1905), malaria's entry into the body (1902), poliovirus in tissue culture (1954), *Helicobacter pylori* (2005), and a malaria therapy (2015).

Vaccination as immune memory, antimicrobial resistance, penicillin, and smallpox eradication are already in the pack.

## Estimates for this section

| Area | Core estimate | This tranche |
| --- | ---: | ---: |
| Earth systems | 6,000 | 32 |
| Climate | 4,000 | 21 |
| Nature and ecology | 6,000 | 11 |
| Biology | 10,000 | 12 |
| Human body | 5,000 | 10 |
| Health basics | 6,000 | 47 |
| **This section** | **37,000** | **133** |

The 37,000 is an estimate of this section's share of the 50,000–200,000 core band. It is not a promise that the other sections will sum with it to a particular total. Shards sit outside the band and can be much larger.

## This tranche, counted

All 133 cards have at least one source URL that was opened. None are unsourced.

| Claim type | Cards |
| --- | ---: |
| fact | 127 |
| interpretation | 4 |
| contested | 2 |
| opinion | 0 |

The four interpretations are Paine's 1966 suggestion about predators, the 2015 planetary-boundaries framework, the 1990 three-domain proposal, and Beadle and Tatum's 1941 account of genes and reactions. Their evidence is weak because the gate classes `api.openalex.org` as an unlisted host. The claims were not rewritten. The contested cards are the USGS volcano page, which prints more than one count, and the March 2007 USGS fact sheet, which leaves the base of the Quaternary at either about 1.8 or about 2.6 million years.

| Evidence | Cards |
| --- | ---: |
| strong | 84 |
| moderate | 42 |
| weak | 7 |
| none | 0 |

Strong means the claim is the wording or the listed number of a source the gate classes as official, primary, or peer-reviewed. Moderate means a textbook in the gate's secondary class, or an agency estimate built on incomplete registration. Weak means the only opened URL is a host the gate has not classed, which here is OpenAlex, `cbd.int`, and `fao.org`. Global death totals are moderate. Mauna Loa monthly means and the USGS interior descriptions are strong.

Sourced share of this tranche: 133 of 133.
