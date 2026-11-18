# Core pack

World cards for the base pack. Each file is one claim. A card quotes a page that was opened. It does not borrow a Wikipedia article.

The truth gate is `v2/tools/truth-gate`. A host the gate does not classify has a ceiling of `weak`. The label on those cards is that ceiling. The quotation is still the page that was opened.

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
