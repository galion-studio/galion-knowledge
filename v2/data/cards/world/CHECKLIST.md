# World card source checklist

Checked 18 November 2026. This log is the source check for `v2/data/cards/world/`.

URL check labels:

- `http_200` — the URL returned HTTP 200 or 202 to a direct fetch on 18 November 2026.
- `doi_registered_publisher_blocked` — Crossref has a metadata record for the DOI (title, authors, year), and `doi.org` returns a redirect. The publisher then returned 403 or 405 to this client. The DOI is registered. The paper is not invented. The publisher blocked the bot.
- `host_reset_on_recheck` — the host closed the connection on the recheck. The text had been retrieved earlier the same day.

Status counts: **87 sourced**, **2 partially sourced**, **0 unsourced**. No card is marked `unsourced`, because claims that could not be tied to a retrieved source were left out of the pack rather than written as fact.

| Card | Category | Claim type | Status | Evidence | URL check | Note |
| --- | --- | --- | --- | --- | --- | --- |
| `world.arts.chauvet-cave-chronology` | arts | fact | sourced | strong | doi_registered_publisher_blocked |  |
| `world.arts.iliad-attributed-to-homer` | arts | contested | partially_sourced | limited | http_200 | Partially sourced. Wikisource identifies the epic and the traditional attribution. The oral-composition alternative is flagged and has no second URL in this card. |
| `world.arts.shakespeare-first-folio-1623` | arts | fact | sourced | strong | http_200 |  |
| `world.biology.action-potential-1952` | biology | fact | sourced | strong | http_200 |  |
| `world.biology.atp-synthase-and-the-sodium-pump` | biology | fact | sourced | strong | http_200 |  |
| `world.biology.central-dogma-1970` | biology | fact | sourced | strong | http_200 |  |
| `world.biology.chemiosmotic-coupling-1961` | biology | fact | sourced | strong | http_200 |  |
| `world.biology.crispr-cas9-2012` | biology | fact | sourced | strong | doi_registered_publisher_blocked |  |
| `world.biology.dna-double-helix-1953` | biology | fact | sourced | strong | http_200 |  |
| `world.biology.endosymbiosis-1967` | biology | fact | sourced | strong | http_200 |  |
| `world.biology.mendelian-proportions-1908` | biology | fact | sourced | strong | doi_registered_publisher_blocked |  |
| `world.biology.natural-selection-1859` | biology | fact | sourced | strong | http_200 |  |
| `world.geography.glottolog-languages` | geography | fact | sourced | strong | http_200 |  |
| `world.geography.greenwich-meridian-1884` | geography | fact | sourced | strong | http_200 |  |
| `world.geography.koppen-geiger-map-2007` | geography | fact | sourced | strong | http_200 |  |
| `world.geography.monsoon-processes` | geography | fact | sourced | strong | doi_registered_publisher_blocked |  |
| `world.geography.world-population-prospects` | geography | fact | sourced | strong | http_200 |  |
| `world.history.agriculture-multiple-origins` | history | interpretation | sourced | moderate | doi_registered_publisher_blocked |  |
| `world.history.atlantic-slave-trade-estimates` | history | fact | sourced | strong | http_200 | Estimates page returned HTTP 200. Table total 12,521,354 embarked (1501–1866) was read from the rendered estimates table. Overview essay says some 12.5 million shipped and 10.7 million arrived. Figures are estimates, including imputed voyages. |
| `world.history.black-death-pathogen` | history | fact | sourced | strong | http_200 |  |
| `world.history.first-world-war-responsibility` | history | contested | sourced | disputed | http_200 |  |
| `world.history.haitian-independence-1804` | history | fact | sourced | strong | http_200 |  |
| `world.history.holocaust-victim-counts` | history | fact | sourced | strong | http_200 |  |
| `world.history.magna-carta-1215-1225` | history | fact | sourced | strong | http_200 |  |
| `world.history.pericles-funeral-oration` | history | interpretation | sourced | moderate | http_200 |  |
| `world.history.rights-of-man-1789` | history | contested | sourced | strong | http_200 |  |
| `world.history.scientific-revolutions-contested` | history | contested | sourced | disputed | http_200 |  |
| `world.law.cultural-relativist-objection-1947` | law | contested | sourced | disputed | doi_registered_publisher_blocked, http_200 |  |
| `world.law.geneva-civilians-1949` | law | fact | sourced | strong | http_200 |  |
| `world.law.habeas-corpus-clause` | law | fact | sourced | strong | http_200 |  |
| `world.law.icj-sources-of-law` | law | fact | sourced | strong | http_200 |  |
| `world.law.presumption-of-innocence` | law | fact | sourced | strong | http_200 |  |
| `world.law.rule-of-law-two-accounts` | law | contested | sourced | disputed | http_200 |  |
| `world.law.udhr-1948` | law | fact | sourced | strong | http_200 |  |
| `world.mathematics.bayes-doctrine-of-chances` | mathematics | fact | sourced | strong | doi_registered_publisher_blocked |  |
| `world.mathematics.goedel-undecidability` | mathematics | fact | sourced | strong | http_200 |  |
| `world.mathematics.noneuclidean-geometry` | mathematics | fact | sourced | strong | http_200 |  |
| `world.mathematics.plimpton-322-reassessment` | mathematics | contested | sourced | disputed | http_200 |  |
| `world.mathematics.probability-interpretations` | mathematics | contested | sourced | disputed | http_200 |  |
| `world.mathematics.riemann-hypothesis-open` | mathematics | fact | sourced | strong | http_200 |  |
| `world.mathematics.turing-computable-numbers` | mathematics | fact | sourced | strong | doi_registered_publisher_blocked |  |
| `world.medicine.antimicrobial-resistance` | medicine | fact | sourced | strong | http_200 |  |
| `world.medicine.insulin-nobel-1923` | medicine | fact | sourced | strong | http_200 |  |
| `world.medicine.nucleoside-modified-rna-2005` | medicine | fact | sourced | strong | http_200 |  |
| `world.medicine.penicillin-1929` | medicine | fact | sourced | strong | http_200 |  |
| `world.medicine.streptomycin-investigation-1948` | medicine | fact | partially_sourced | moderate | doi_registered_publisher_blocked, http_200 | Partially sourced. Title, year, journal, and MRC authorship are sourced. The full text was not opened, so the card does not claim the trial was randomized. |
| `world.medicine.who-health-definition` | medicine | fact | sourced | strong | http_200 |  |
| `world.nature.arrhenius-carbonic-acid-1896` | nature | fact | sourced | strong | doi_registered_publisher_blocked |  |
| `world.nature.earth-energy-budget-2009` | nature | fact | sourced | strong | doi_registered_publisher_blocked |  |
| `world.nature.human-domination-1997` | nature | interpretation | sourced | moderate | doi_registered_publisher_blocked | All figures are the 1997 abstract's estimates, not a 2026 census. |
| `world.nature.keeling-co2-1960` | nature | fact | sourced | strong | http_200 |  |
| `world.nature.ocean-carbon-and-ph` | nature | fact | sourced | strong | http_200 |  |
| `world.nature.orbital-pacemaker-ice-ages` | nature | fact | sourced | strong | doi_registered_publisher_blocked |  |
| `world.nature.ozone-chlorine-and-the-antarctic-loss` | nature | fact | sourced | strong | http_200 |  |
| `world.nature.seafloor-magnetic-stripes` | nature | fact | sourced | strong | http_200 |  |
| `world.nature.water-cycle` | nature | fact | sourced | strong | http_200 |  |
| `world.philosophy.analects-and-confucius` | philosophy | interpretation | sourced | moderate | http_200 |  |
| `world.philosophy.aristotle-four-causes` | philosophy | interpretation | sourced | strong | http_200 |  |
| `world.philosophy.cartesian-doubt` | philosophy | interpretation | sourced | moderate | http_200 |  |
| `world.philosophy.four-noble-truths` | philosophy | interpretation | sourced | strong | http_200 |  |
| `world.philosophy.free-will-not-settled` | philosophy | contested | sourced | disputed | http_200 |  |
| `world.philosophy.hume-induction` | philosophy | interpretation | sourced | moderate | http_200 |  |
| `world.philosophy.kant-groundwork` | philosophy | interpretation | sourced | moderate | http_200 |  |
| `world.philosophy.popper-demarcation` | philosophy | interpretation | sourced | moderate | http_200 |  |
| `world.philosophy.virtue-ethics` | philosophy | interpretation | sourced | moderate | http_200 |  |
| `world.science.cosmic-microwave-background` | science | fact | sourced | strong | doi_registered_publisher_blocked, http_200 |  |
| `world.science.general-relativity-1916` | science | fact | sourced | strong | doi_registered_publisher_blocked, http_200 |  |
| `world.science.gw150914` | science | fact | sourced | strong | doi_registered_publisher_blocked | Abstract numbers, including the 14 September 2015 09:50:45 UTC detection and the 90% credible intervals, were read from the paper abstract via OpenAlex. doi.org resolves; the APS copy returned 403 to this client. |
| `world.science.higgs-2012` | science | fact | sourced | strong | http_200 |  |
| `world.science.mass-energy-1905` | science | fact | sourced | strong | doi_registered_publisher_blocked, http_200 |  |
| `world.science.neutrino-flavor-change` | science | fact | sourced | strong | doi_registered_publisher_blocked, http_200 |  |
| `world.science.photoelectric-effect` | science | fact | sourced | strong | doi_registered_publisher_blocked, http_200 |  |
| `world.science.rutherford-nuclear-atom` | science | fact | sourced | strong | doi_registered_publisher_blocked |  |
| `world.science.special-relativity-1905` | science | fact | sourced | strong | doi_registered_publisher_blocked, http_200 |  |
| `world.science.speed-of-light-exact` | science | fact | sourced | strong | http_200 |  |
| `world.science.stellar-element-synthesis` | science | fact | sourced | strong | doi_registered_publisher_blocked, http_200 |  |
| `world.science.uncertainty-principle` | science | contested | sourced | disputed | http_200 |  |
| `world.society.bank-money-creation` | society | fact | sourced | strong | http_200 |  |
| `world.society.demographic-transition-1996` | society | interpretation | sourced | moderate | doi_registered_publisher_blocked | Wording is taken from Kirk's abstract, including his 'continuum of progress' phrase, which the card does not treat as a law. |
| `world.society.public-goods-1954` | society | interpretation | sourced | strong | http_200 |  |
| `world.society.smith-division-of-labor` | society | fact | sourced | strong | http_200 |  |
| `world.society.us-gdp-what-bea-measures` | society | fact | sourced | strong | http_200 | Definition taken from the BEA learning-center page, including the meta description: value of final goods and services produced in the United States. Real versus nominal and the three quarterly estimates are on the same page. No welfare claim is added. |
| `world.technology.berners-lee-proposal-1989` | technology | fact | sourced | strong | http_200 |  |
| `world.technology.faraday-induction-1832` | technology | fact | sourced | strong | doi_registered_publisher_blocked |  |
| `world.technology.gps-needs-relativity` | technology | fact | sourced | strong | http_200 |  |
| `world.technology.internetworking-1974` | technology | fact | sourced | strong | http_200 |  |
| `world.technology.jikji-metal-type-1377` | technology | fact | sourced | strong | host_reset_on_recheck | UNESCO HTML and PDF hosts reset on the automated recheck. The Memory of the World entry text (1377, Heungdeok-sa, movable metal type, oldest extant example) was retrieved earlier the same day. |
| `world.technology.point-contact-transistor-1948` | technology | fact | sourced | strong | doi_registered_publisher_blocked, http_200 |  |
| `world.technology.shannon-communication-1948` | technology | fact | sourced | strong | http_200 |  |

## Count by category

- science: 12
- history: 10
- biology: 9
- nature: 9
- philosophy: 9
- law: 7
- mathematics: 7
- technology: 7
- medicine: 6
- geography: 5
- society: 5
- arts: 3
- total: 89

## Left out on purpose

These were considered and not written, because a citable URL was not confirmed in this session:

- Mendel's 1866 paper (Wikisource and MendelWeb did not resolve).
- Hayek's 1945 *American Economic Review* essay (the DOI tried, `10.2307/1809376`, was not in Crossref; `10.1257/aer.35.4.519` returned 404).
- Jenner's 1798 inquiry, Ricardo on comparative advantage, a sourced account of the fall of the western Roman Empire, the Truman announcement on Hiroshima, and the Wannsee protocol text.
- A second source for Homeric oral composition. The Iliad card flags that question and stays partially sourced.
- Kuznets's warning that national income is not welfare. No page with his wording was opened, so the GDP card does not borrow it.

## Open inside the cards

These are marked contested or explicitly not settled, with the disagreement left in place:

- Uncertainty-principle glosses (formal relation versus measurement-disturbance story).
- Which sites produce the heaviest elements, after B2FH and the 2017 kilonova.
- The mechanism of the ~100,000-year ice-age cycle.
- How many independent origins of agriculture, beyond Price and Bar-Yosef's 2011 'at least ten'.
- Responsibility for the outbreak of war in 1914 (Fischer's line and Clark's *Sleepwalkers*, via Mombauer's survey).
- Whether 'the Scientific Revolution' is a good description of early modern science.
- The scope of equality in the 1789 Declaration's first article.
- Whether Magna Carta was 'a medieval revolution' (the UK National Archives poses this as a question).
- Free will (compatibilist and incompatibilist accounts).
- Falsifiability as a demarcation criterion.
- What probability means, given Kolmogorov's axioms.
- How to read Plimpton 322.
- The rule of law (UN definition versus Raz's thinner one).
- Universal human rights versus the 1947 anthropological statement.
- Bank money creation versus the textbook deposit-multiplier story (the Bank of England's 2014 account rejects the multiplier as a description of modern practice).
- The Riemann hypothesis, listed unsolved by the Clay Mathematics Institute.

Holocaust and slave-trade figures in the cards are the publishing institution's reconstructions. They are not a single ledger of named people.

