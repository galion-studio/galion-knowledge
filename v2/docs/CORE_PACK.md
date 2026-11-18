# Base World Core Pack

Perpetual Open MIT License. Copyright (c) 2026 Galion Labs.

This file is the map of core knowledge for knowledge.galion.app. This pull request writes only the Earth, climate, nature, biology, body, and health section. Physics and chemistry, astronomy and cosmology, history and religion, mathematics and logic, epistemology, and money, law, institutions, and technology are other agents' sections and are not filled here.

The whole core pack is aimed at about 50,000 to 200,000 cards. That band is the owner's target for the core, not a count of cards that exist. Counts below that are labeled **estimates**. The first tranche in this pull request is 121 cards. It is a start, not the section.

## How a card sits in the stack

`v2/docs/MEMORY_STACK.md` on the memory-crate branch describes a core file that is searched before any shard. In that design, cards with `claim_type` fact or `evidence_strength` strong are the core tier. Shards are immutable files split by section and category. This section uses the same split:

- A card is **core** when a person needs it to understand how the Earth system, a living system, a body, or a basic health measurement works, at the level of a mechanism, a definition, or one measured quantity with its date and its source.
- A card is a **shard** when it is a row in a long table: one earthquake, one weather station, one species account, one gene, one drug label, one national guideline, one trial. Those rows use the same schema. They are not promoted into the core just because a paper exists.

Cards in this tranche are tagged `core-pack`. They live in `v2/data/cards/world/` and follow `v2/data/SCHEMA.md`. One card is one claim. A fact is not written as an opinion. Where a page itself prints two counts, both counts are kept.

Sources for this tranche were opened on 18 November 2026. They are agency pages, the IPCC Working Group I Summary for Policymakers PDF, the Convention on Biological Diversity's own Article 2, Nobel Prize API motivation lines, and OpenAlex records of paper abstracts. Wikipedia was not used.

## Earth systems

**Core, estimate 6,000.** How the planet is built and how its large parts move and store water and air: crust, mantle, core, lithosphere, oceans as one body, depth, earthquakes as magnitude and intensity, groundwater, the nitrogen that organisms can actually use. Each card is one quantity or one mechanism, with the edition of the source.

**Shard, not core.** Earthquake catalogs, stream gauges, well logs, mineral assays, soil maps, bathymetry grids, and local geologic maps. The core keeps the scale and the mechanism. The shard keeps the rows.

**This tranche, 29 cards.** USGS interior pages for the shells, crust thickness, the Mohorovičić discontinuity, about twelve plates, and the lithosphere. NASA's Earth Fact Sheet for core radius, atmosphere and hydrosphere mass, scale height, albedo, black-body temperature, the magnetic-field table, topographic range, escape velocity, solar irradiance, and the moment-of-inertia factor. NOAA for one ocean, the Southern Ocean boundary, 71 percent coverage (kept distinct from the USGS 75 percent liquid-and-frozen figure already on the water-cycle card), mean depth, and Challenger Deep. USGS for magnitude versus intensity, moment magnitude, the Richter scale's present use, energy, the Modified Mercalli scale, groundwater, and the volcano counts the same USGS site does not reconcile.

**Not in this tranche, still core.** A full rock cycle, a stratigraphic time scale, soil formation, and the biological steps of nitrogen fixation. Those need pages that state them. They were not invented here.

## Climate

**Core, estimate 4,000.** The measured gases, the assessed ranges, and the definitions used to decide that an El Niño is occurring. A global mean needs a year and a method. A later monthly mean does not replace an earlier annual mean.

**Shard, not core.** Daily station series, model output, downscaled projections, and forecast discussions.

**This tranche, 21 cards.** NOAA's ENSO definition and the Niño-3.4 thresholds. NOAA sea level since 1880, the 2023 satellite mean, and the 2006–2015 rate. NOAA methane for June 2026, marked preliminary on the page, and the Mauna Loa monthly mean for September 2026, which is not the 2024 global annual average already stored. NOAA's pre-industrial 280 ppm, the ice-core ceiling of 300 ppm, the pace of the recent rise, carbon dioxide's share of heating influence since 1990, and NOAA's greenhouse wording. IPCC Working Group I (2021) for the 2019 concentrations, the 56 percent land-and-ocean uptake, the two-million-year CO2 comparison, the percentage increases since 1750, the 3,000-year sea-level comparison, Arctic sea ice and glaciers, the equilibrium-climate-sensitivity interval the headline page had left off, and the 2019 radiative forcing.

The headline sentence that human influence has warmed the atmosphere, ocean, and land is already on `world.nature.climate-change`. It is not repeated. The new sensitivity card is the Summary for Policymakers interval that the older card said it would not invent.

**Not in this tranche, still core.** A full account of aerosols, ocean heat content as its own series, and paleoclimate proxies other than the ice-core CO2 ceiling above.

## Nature and ecology

**Core, estimate 6,000.** What an ecosystem is made of and how energy and nutrients move, at the level of a definition or one demonstrated interaction. Diversity within species, between species, and of ecosystems, as the Convention on Biological Diversity defines it. Predation where a named study reports what happened when predators were removed. A proposed planetary boundary stays marked as the authors' framework.

**Shard, not core.** Species accounts, local floras and faunas, protected-area inventories, and plot-level surveys.

**This tranche, 9 cards.** Article 2's definition of biological diversity. Paine's 1966 abstract on predators and rocky-intertidal diversity. The 2015 planetary-boundaries paper, as a framework, not as a measurement that a boundary was crossed. NOAA on corals as animals, polyps and limestone, zooxanthellae, and bleaching. USGS on fixed nitrogen versus nitrogen gas, and on nutrient excess in water, including the United States atmospheric-deposition figure the page states.

**Not in this tranche, still core.** Succession, island biogeography, and a global forest-area total. The FAO forest-assessment page that was opened described the reporting process and did not state a hectare total, so no hectare total was written.

## Biology

**Core, estimate 10,000.** Mechanisms of cells, inheritance, metabolism, and the large divisions of life, each as one claim tied to a paper or a prize citation. A proposal is labeled a proposal. A prize motivation is the sentence the Nobel record prints, not a textbook chapter added around it.

**Shard, not core.** Gene catalogs, protein structures one by one, pathway databases, and organism monographs.

**This tranche, 9 cards.** Woese, Kandler, and Wheelis (1990) proposing three domains. Beadle and Tatum (1941) on genes and specific reactions; the abstract that was read does not use the later phrase "one gene, one enzyme," so the card does not either. Nobel citations for the citric acid cycle, coenzyme A, genetic control of enzyme and virus synthesis, mobile genetic elements, the chromosome in heredity, prions, and tumour viruses and the cell's genetic material.

DNA structure, the genetic code, natural selection, photosynthesis, and the 46-chromosome count are already in the pack and were not rewritten.

**Not in this tranche, still core.** Mitosis and meiosis, membranes, and the experimental result of the Meselson–Stahl paper. The OpenAlex abstract that loaded stated the question and not the result, and the full text did not load, so the result was not written from memory.

## The human body

**Core, estimate 5,000.** How the body's major systems are described by a primary citation or a definition: blood, nerves, digestion, immunity, oxygen-carrying haemoglobin. Anatomy that has not been opened is not filled in.

**Shard, not core.** Regional anatomy, surgical technique, and imaging atlases.

**This tranche, 6 cards.** Nobel citations for human blood groups (1930), the structure of the nervous system (1906), the physiology of digestion (1904), and work on immunity (1908). The 1904 motivation that was read is about digestion. It does not mention conditioned reflexes, and the card does not move the prize onto that subject. WHO's definition of anaemia, too little haemoglobin to carry oxygen, is with the health cards because the same sheet carries the prevalence estimates.

**Not in this tranche, still core.** Chambers of the heart, kidney filtration, and lung gas exchange as anatomical descriptions. A National Library of Medicine textbook page returned a browser check instead of the text.

## Health basics

**Core, estimate 6,000.** What a disease is, in an agency's words, and the agency's own burden estimate with its year. A 2022 estimate and a 2024 estimate of a similar population are two cards when both were printed. They are not averaged. Cause-of-death totals are estimates on top of incomplete registration. The registration limit is itself a core card.

**Shard, not core.** Drug labels, national treatment guidelines, trial registries, and the full ICD code list.

**This tranche, 47 cards.** WHO Global Health Estimates for 2023 causes of death, including the note that registration is often incomplete and that ICD-11 is the classification. Malaria, tuberculosis, cardiovascular disease, drinking water, sanitation, diabetes, obesity, child undernutrition, tobacco, HIV, hypertension, cancer, air pollution, maternal mortality, road deaths, mental disorders, and under-five mortality, each from the fact sheet that was opened, with that sheet's date. WHO's 26 January 2026 healthy-diet sheet for principles, salt, free sugars, fat, and fruit and vegetables. Nobel citations for tuberculosis (1905), malaria's entry into the body (1902), poliovirus in tissue culture (1954), *Helicobacter pylori* (2005), and a malaria therapy (2015).

Vaccination as immune memory, antimicrobial resistance, penicillin, and smallpox eradication are already in the pack.

## Estimates for this section

| Area | Core estimate | This tranche |
| --- | ---: | ---: |
| Earth systems | 6,000 | 29 |
| Climate | 4,000 | 21 |
| Nature and ecology | 6,000 | 9 |
| Biology | 10,000 | 9 |
| Human body | 5,000 | 6 |
| Health basics | 6,000 | 47 |
| **This section** | **37,000** | **121** |

The 37,000 is an estimate of this section's share of the 50,000–200,000 core band. It is not a promise that the other sections will sum with it to a particular total. Shards sit outside the band and can be much larger.

## This tranche, counted

All 121 cards have at least one source URL that was opened. None are unsourced.

| Claim type | Cards |
| --- | ---: |
| fact | 116 |
| interpretation | 4 |
| contested | 1 |
| opinion | 0 |

The four interpretations are Paine's 1966 suggestion about predators, the 2015 planetary-boundaries framework, the 1990 three-domain proposal, and Beadle and Tatum's 1941 account of genes and reactions. The contested card is the USGS volcano page, which prints about 1,350 potentially active volcanoes, quotes a 2016 article saying about 1,550, and elsewhere counts more than 1,500 eruptions in 10,000 years without reconciling the sets.

| Evidence | Cards |
| --- | ---: |
| strong | 80 |
| moderate | 41 |
| weak | 0 |
| none | 0 |

Strong means the claim is the wording or the listed number of the primary document. Moderate means a single paper's abstract that does not settle the question, or an agency estimate built on incomplete registration rather than a direct instrument reading. Global death totals are moderate for that reason. Mauna Loa monthly means and the USGS interior descriptions are strong.

Sourced share of this tranche: 121 of 121.
