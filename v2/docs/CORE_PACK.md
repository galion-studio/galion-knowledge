# Core pack

The base world pack is the small set of sourced cards a person needs before the shards. One card is one claim. A shard is everything that can wait: a catalogue row, a local statute, a single paper that does not change the picture.

Sections below are filled by the agent that owns that area. This file's first section is physics, constants and SI, matter and energy, chemistry, and astronomy and cosmology.

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

Element-by-element spectral lines, the full nuclide chart, every CODATA derived constant, per-planet atmospheric composition tables beyond the Venus and Mars pressures named above, and exoplanet rows. Earth, climate, life, health, history, method, money, law, and technology are other sections of this file.

### Adding another card in this section

Open the page. One claim. Put the URL you opened in `sources`, with author, date, and `accessed`. Do not label the card above the truth-gate ceiling for that host. `iaea.org` currently ceilings at `weak`. NIST, BIPM, NASA, and arXiv can carry `strong` when the claim is the row or the sentence that was read. Tag `core-pack` and `area:` with one of `constants`, `physics`, `matter`, `chemistry`, `astronomy`, `cosmology`.
