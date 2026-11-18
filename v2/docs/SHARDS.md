# Add-on shards

Add-on shards are optional knowledge. The Base World Core Pack stays on the device. A shard is loaded when a question falls outside that pack. The catalog is 34 shards. Three are seeded. The other 31 are named, with a scope and the sources a later seed would draw on, and with no cards yet.

This is not a second copy of the core. The core says that a thing exists. A shard carries the clause, the constant with its uncertainty, or the instruction a named service actually printed.

## The manifest

The file is `v2/shards/manifest.json`. The schema string is `galion-shard-manifest/1`. That is the schema `ScaleIndex` writes in [PR #3](https://github.com/galion-studio/galion-knowledge/pull/3), on branch `cursor/horbm-memory-stack-4552`, in `v2/memory/src/scale.rs`. The Rust structs are `ShardManifest` and `ManifestFile`. Serde on those structs ignores unknown fields and requires the ones below. This file keeps those fields and adds the catalog fields beside them. It does not invent a second schema.

| Field | Where it comes from |
| --- | --- |
| `schema` | `galion-shard-manifest/1` |
| `version` | Publication count of this catalog. The schema generation is the `1` in `galion-shard-manifest/1`, and `ScaleIndex` writes `"1"` for a newly built index. This file is not that index. Publication 1 was the first catalog. Publication 2 is the core digest after the core pack grew (`08fe16e5e619fc34eec824312cd6efb38f1e57cf8b4b747b601a717b8ebe528e`, 1,590,111 bytes, 778 cards). Publication 3 is the core digest after the history and religion cards joined that pack (`2a625fc33126adbefbadba0aba32471a597374b367ad0c6840d345927df91a26`, 2,016,490 bytes, 1,013 cards). Publication 4 is the core digest after the earth, life, and health cards joined that pack (`5cfe36ca7a55506b232a49312856be46d6b6e20ffeb82f8889303fe179b9688d`, 2,239,112 bytes, 1,146 cards). A new core digest is a new publication. The old digest is not rewritten into the old version. |
| `immutable` | `true`. A correction is a new manifest. A shard file is not edited in place. |
| `note` | What the hash is, and what it is not. |
| `core_pack` | `id` `core`, `section` `core`, `category` `core`, `sha256`, `bytes` |
| `shards[]` | `id`, `section`, `category`, `sha256`, `bytes`, plus `title`, `scope`, `card_count`, `depends_on`, `priority`, `status` |

Each directory `v2/shards/<id>/` has `shard.json` with the same schema string and with `depends_on: ["core"]`. Seeded shards also have `cards/<card-id>.json`. A card uses the fields in [SCHEMA.md](../data/SCHEMA.md). Its `section` is `shards`. Its `category` is the shard id. The site build rejects a card that breaks that, and it rejects a sha256 that does not match the cards on disk.

`depends_on` names the core pack id from PR #3. It does not embed a copy of the core.

### What the sha256 is

PR #3 hashes the SQLite file `ScaleIndex` has just written (`core.sqlite` or `shard-<section>-<category>.sqlite`). Those files are not in this repository. This manifest does not invent those sqlite hashes.

The sha256 here is the card bundle, marked `payload: "card-bundle/1"`. For a shard it is computed from `v2/shards/<id>/cards/*.json`. For `core_pack` it is computed from every `*.json` file under `v2/data/cards/`. `shard.json` itself is not inside the hash. The bytes are, in lexicographic order of the relative path:

```text
<relative path utf-8>
<newline>
<raw file bytes, which already end in a newline>
<newline>
```

An unseeded shard has no card files. Its bundle is empty. The sha256 of the empty bundle is `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` and `bytes` is 0. That means nothing has been published. It does not mean a download will return a useful file.

When a device builds an FTS5 file from a loaded pack, `ScaleIndex` can hash that sqlite file into a later manifest. The card-bundle hash and the sqlite hash are two digests of two different byte strings. Both can use this schema. They must not be compared to each other.

PR #3's shards are also a different cut of the data. `ScaleIndex` puts `claim_type = fact` or `evidence_strength = strong` into the core pack and splits the other ingested cards into immutable FTS files by `section` and `category`. An add-on shard is a pack the device may not have loaded yet. It is not that FTS split. A loaded add-on can later be indexed by the same crate. The crate, as written on that branch, does not fetch a missing file.

## How HORBM picks a shard

The honesty cards already say what an empty lookup sounds like. `horbm-say-i-dont-know` and `horbm.honesty.i-dont-know` say "I don't know" first, and "I don't have a source for that" when nothing was found. `horbm-persona-galion-research` says the research voice keeps three piles, found, inferred, and unknown, and does not fill a hole. This path uses those lines. It does not replace them.

1. Search the core pack first. In PR #3 that is `core.sqlite`, open on every query, before any shard. The hit list is still at most four, and each hit still carries `said_by`, a date, and a source.
2. If the core returns a sourced hit that covers the question, use it. Do not load a shard to decorate a hit the core already has.
3. If the honest answer is "I don't know", do not guess and do not invent a citation. Match the question against the shard catalog: `title`, `scope`, and `keywords` on `shard.json`. This match is against the catalog the device can store, not against cards that are not on the device.
4. If one shard's scope covers the gap, offer that shard. If it is not local, the device may fetch it from the Galion open network by the manifest sha256. PR #3 is explicit that the crate does not perform that fetch. Fetching is the device's job, and only by that hash. A file that does not hash to the manifest row is not the shard.
5. PR #3 routes a query to at most three FTS shards, after the core. An add-on pack is one optional file on top of that, not a silent fourth corpus. The device does not open every catalog shard.
6. If the person does not load the shard, or no scope fits, ask Galion Research. That is the lookup voice in `horbm-persona-galion-research`. Say a lookup is in flight if the wait will be heard. If it returns nothing, use the lines already written: the lookup did not come back in time, the path is not reachable, there is no source, or the lookup is not allowed. Then stop, or give the local part and mark it local.
7. Log the gap. The log records the question, the date, the shard id that was offered or `none`, and whether a pack was loaded. The log is a queue for a card. It is not itself a fact, and it is not a profile of the person.
8. A sourced card is written later, into a new version of the shard. The old file is not rewritten. `immutable` stays true. The manifest version moves.

This routing is the policy for the catalog. It is not a claim that `v2/memory` on the PR #3 branch already contains the catalog match or the gap log. That branch routes by a rare-term lexicon and a shard centroid among FTS files it has already built.

## What was seeded

| Shard | Cards |
| --- | ---: |
| `first-aid` | 57 |
| `history-primary-documents` | 52 |
| `physics-engineering` | 51 |

160 cards in all. Each card names the page it was written from. Pages were opened on 2026-11-18. A `fact` card quotes or closely reports that page. Where two opened pages do not say the same thing, the card is `contested` and both sides stay. A number that the NIST listing printed with an ellipsis was not completed from memory. A disagreement whose other side was not opened was not invented. St John Ambulance's emergency number is 999 or 112. CDC's is 911. Neither is written as the world's number.

The truth gate also reads `v2/shards/<id>/cards/`. A host it classes as `other` cannot support a label above `weak`. St John Ambulance, the Constitute Project, and nato.int are in that class. Cards whose only sources are those hosts are labeled `weak`, with a `history` entry that records the previous label. The pages were not replaced and no source was added to raise the ceiling.

No card is Wikipedia prose, and no card cites Wikipedia.

The 31 unseeded shards are the rest of the map: clinical medicine, public health, mental health, medicine lists, international law, law by region, history by era and by region, chemistry, astronomy, earth science, organisms, mathematics, languages, agriculture, crafts, computing, economic series, religious texts, arts and music, food composition, energy and climate series, and places. High priority means offer that shard first when the gap matches it. Low priority means it is specialist.

## Catalog

Primary-source URLs below were opened on 2026-11-18. The page title was the page's own. A homepage that did not answer, or that answered with a block page, is not listed.

### Practical health and first aid
- **Id:** `first-aid`
- **Priority:** high
- **Cards:** 57
- **Scope:** Immediate care: what a named service says to do, the emergency number that service prints, and the limits it states. United Kingdom steps from St John Ambulance are not treated as United States steps from CDC or MedlinePlus. Doses stay with the page that stated them.
- **Why it is not in the core:** The core pack keeps mechanisms, such as what a vaccine does. Step-by-step care, local emergency numbers, and product doses are deeper, they are revised, and a device that is not in that situation should not carry them.
- **Primary sources opened for this catalog entry:**
  - [St John Ambulance first aid advice](https://www.sja.org.uk/first-aid-advice/)
  - [CDC](https://www.cdc.gov/index.html)
  - [WHO fact sheets](https://www.who.int/news-room/fact-sheets)
  - [MedlinePlus](https://medlineplus.gov/)
  - [988 Suicide & Crisis Lifeline, SAMHSA](https://www.samhsa.gov/mental-health/988)

### Clinical medicine
- **Id:** `medicine-clinical`
- **Priority:** high
- **Cards:** 0
- **Scope:** Disease descriptions, diagnostic criteria, and clinical guidelines beyond first aid. Not a formulary and not a procedure for making a drug.
- **Why it is not in the core:** Guidelines are long, they are revised on a schedule, and they differ by country. The always-on pack cannot be a clinic.
- **Primary sources opened for this catalog entry:**
  - [WHO guidelines](https://www.who.int/publications/who-guidelines)
  - [NICE guidance](https://www.nice.org.uk/guidance)

### Public health
- **Id:** `public-health`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Population rates, vaccination programmes, sanitation, and outbreak reports. The numbers move.
- **Why it is not in the core:** A rate from one year should not be frozen in the pack every device keeps. Load it when the question is a population.
- **Primary sources opened for this catalog entry:**
  - [WHO fact sheets](https://www.who.int/news-room/fact-sheets)
  - [CDC](https://www.cdc.gov/index.html)

### Mental health
- **Id:** `mental-health`
- **Priority:** medium
- **Cards:** 0
- **Scope:** What health agencies publish on mental disorders, and the crisis services they name. Not a diagnosis of the person in the room.
- **Why it is not in the core:** Classification systems and services are deep and local. The first-aid shard carries the United States 988 line because it is the immediate number. This shard is the rest.
- **Primary sources opened for this catalog entry:**
  - [Mental disorders, WHO](https://www.who.int/news-room/fact-sheets/detail/mental-disorders)
  - [988 Suicide & Crisis Lifeline, SAMHSA](https://www.samhsa.gov/mental-health/988)

### Medicines lists
- **Id:** `pharmacy`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Essential-medicine lists and regulatory names. Not synthesis, not a dose invented for a person.
- **Why it is not in the core:** A formulary is a table that regulators replace. It does not belong in the pack that is always resident.
- **Primary sources opened for this catalog entry:**
  - [WHO Expert Committee on the Selection and Use of Essential Medicines](https://www.who.int/groups/expert-committee-on-selection-and-use-of-essential-medicines)

### International law
- **Id:** `law-international`
- **Priority:** high
- **Cards:** 0
- **Scope:** Treaties, the Statute of the International Court of Justice, and the law of armed conflict as the publishing bodies print it.
- **Why it is not in the core:** The core has a few instruments. The treaty collection is the depth, and most questions never touch it.
- **Primary sources opened for this catalog entry:**
  - [United Nations Charter](https://www.un.org/en/about-us/un-charter/full-text)
  - [Statute of the International Court of Justice](https://www.icj-cij.org/statute)
  - [United Nations Treaty Collection](https://treaties.un.org/)
  - [ICRC, Law and policy](https://www.icrc.org/en/law-and-policy)

### Law by region
- **Id:** `law-by-region`
- **Priority:** high
- **Cards:** 0
- **Scope:** Constitutions and statutes of a place, loaded for the jurisdiction the question is actually in. One country's code is not presented as the world's.
- **Why it is not in the core:** There is no single code. Carrying every jurisdiction would swamp the core, and carrying one jurisdiction would pretend it was universal.
- **Primary sources opened for this catalog entry:**
  - [Constitute](https://www.constituteproject.org/)
  - [GovInfo](https://www.govinfo.gov/)
  - [The National Archives (UK)](https://www.nationalarchives.gov.uk/)
  - [Supreme Court of the United States](https://www.supremecourt.gov/)
  - [National Archives of Japan, digital archive](https://www.digital.archives.go.jp/)

### History, primary documents
- **Id:** `history-primary-documents`
- **Priority:** high
- **Cards:** 52
- **Scope:** What a named document says: a clause, an article, a holding. The core says the document exists. This shard quotes it. A later political use of the sentence is kept only when a second opened source states that use.
- **Why it is not in the core:** Clause-level text is the depth. The always-on pack stays at the document's existence and its most cited sentence.
- **Primary sources opened for this catalog entry:**
  - [America's Founding Documents, National Archives](https://www.archives.gov/founding-docs)
  - [United Nations Charter](https://www.un.org/en/about-us/un-charter/full-text)
  - [The North Atlantic Treaty](https://www.nato.int/en/about-us/official-texts-and-resources/official-texts/1949/04/04/the-north-atlantic-treaty)
  - [Avalon Project](https://avalon.law.yale.edu/)
  - [Constitute](https://www.constituteproject.org/)

### History, ancient
- **Id:** `history-ancient`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Ancient societies from their texts and from archaeology reports, not from a single textbook narrative.
- **Why it is not in the core:** The core names a few ancient anchors. The languages, laws, and finds are a shelf.
- **Primary sources opened for this catalog entry:**
  - [Perseus Digital Library](https://www.perseus.tufts.edu/hopper/)
  - [Chinese Text Project](https://ctext.org/)
  - [Louvre collections](https://collections.louvre.fr/)

### History, medieval
- **Id:** `history-medieval`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Roughly the centuries between late antiquity and the sixteenth century, from charters and chronicles.
- **Why it is not in the core:** The period is large and the core already has the few documents it always needs, such as the charter tradition behind Magna Carta.
- **Primary sources opened for this catalog entry:**
  - [The National Archives (UK)](https://www.nationalarchives.gov.uk/)
  - [Bibliothèque nationale de France](https://www.bnf.fr/fr)
  - [Avalon Project](https://avalon.law.yale.edu/)

### History, early modern
- **Id:** `history-early-modern`
- **Priority:** medium
- **Cards:** 0
- **Scope:** From the sixteenth century through the eighteenth, from state papers and printed books of the time.
- **Why it is not in the core:** The core keeps a few revolutions and instruments. The rest of the period is optional.
- **Primary sources opened for this catalog entry:**
  - [Avalon Project](https://avalon.law.yale.edu/)
  - [Library of Congress](https://www.loc.gov/)
  - [Bibliothèque nationale de France](https://www.bnf.fr/fr)

### History, 1800 to 1945
- **Id:** `history-modern`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Industrial states, empires, and the two world wars, from the documents and the statistical series, with disagreements left standing.
- **Why it is not in the core:** The core has the war-crimes instruments and a few battles. Campaigns, treaties, and counts are the add-on.
- **Primary sources opened for this catalog entry:**
  - [Library of Congress](https://www.loc.gov/)
  - [Avalon Project](https://avalon.law.yale.edu/)
  - [The National Archives (UK)](https://www.nationalarchives.gov.uk/)

### History since 1945
- **Id:** `history-contemporary`
- **Priority:** medium
- **Cards:** 0
- **Scope:** The post-1945 record from treaties, official statistics, and court judgments. Not a running news summary.
- **Why it is not in the core:** The period is still being filed. A frozen core paragraph would go stale, and the document trail is long.
- **Primary sources opened for this catalog entry:**
  - [United Nations Treaty Collection](https://treaties.un.org/)
  - [United Nations Charter](https://www.un.org/en/about-us/un-charter/full-text)
  - [GovInfo](https://www.govinfo.gov/)

### History, Africa
- **Id:** `history-africa`
- **Priority:** medium
- **Cards:** 0
- **Scope:** African histories from archives and archaeology, regional rather than a single continental story.
- **Why it is not in the core:** The core is not a history of any one region. This shard is loaded when the question is that region.
- **Primary sources opened for this catalog entry:**
  - [UNESCO](https://www.unesco.org/en)
  - [Library of Congress](https://www.loc.gov/)

### History, the Americas
- **Id:** `history-americas`
- **Priority:** medium
- **Cards:** 0
- **Scope:** The continents' histories beyond the United States documents that the primary-documents shard already quotes.
- **Why it is not in the core:** United States founding texts are a narrow slice. The rest of the Americas is its own pack.
- **Primary sources opened for this catalog entry:**
  - [Library of Congress](https://www.loc.gov/)
  - [America's Founding Documents, National Archives](https://www.archives.gov/founding-docs)

### History, Asia
- **Id:** `history-asia`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Asian histories from their own archives and text collections, not from a European chronology with Asia added.
- **Why it is not in the core:** The region is larger than the few core cards that mention it.
- **Primary sources opened for this catalog entry:**
  - [Chinese Text Project](https://ctext.org/)
  - [National Archives of Japan, digital archive](https://www.digital.archives.go.jp/)
  - [Library of Congress](https://www.loc.gov/)

### History, Europe
- **Id:** `history-europe`
- **Priority:** medium
- **Cards:** 0
- **Scope:** European history beyond the handful of charters and treaties in the core and in the primary-documents shard.
- **Why it is not in the core:** Europe is not the default world history. Its depth is optional.
- **Primary sources opened for this catalog entry:**
  - [The National Archives (UK)](https://www.nationalarchives.gov.uk/)
  - [Bibliothèque nationale de France](https://www.bnf.fr/fr)
  - [Avalon Project](https://avalon.law.yale.edu/)

### History, Oceania and the Pacific
- **Id:** `history-oceania`
- **Priority:** low
- **Cards:** 0
- **Scope:** Pacific and Australian histories from their archives and from archaeology.
- **Why it is not in the core:** The core does not carry a regional history. This one is loaded when the question is that ocean.
- **Primary sources opened for this catalog entry:**
  - [UNESCO](https://www.unesco.org/en)
  - [Library of Congress](https://www.loc.gov/)

### Physics and engineering
- **Id:** `physics-engineering`
- **Priority:** high
- **Cards:** 51
- **Scope:** Defined constants, CODATA values with their uncertainties, and the conditions NASA Glenn states on the working equations. A number marked exact in a table is not reported as a measurement, and a truncated listing is not completed from memory.
- **Why it is not in the core:** The core states a few laws and that the speed of light is exact. The digits, the uncertainties, and the assumptions on F = ma, Bernoulli, Mach, and Reynolds are the depth.
- **Primary sources opened for this catalog entry:**
  - [CODATA constants, NIST](https://physics.nist.gov/cuu/Constants/)
  - [The SI, BIPM](https://www.bipm.org/en/measurement-units)
  - [Beginner's Guide to Aeronautics, NASA Glenn](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/)

### Chemistry
- **Id:** `chemistry`
- **Priority:** high
- **Cards:** 0
- **Scope:** Substances, evaluated data, and nomenclature. Not a procedure for making a harmful agent.
- **Why it is not in the core:** The substance table is large. The core keeps the few reactions it needs for the rest of the sciences.
- **Primary sources opened for this catalog entry:**
  - [IUPAC](https://iupac.org/)
  - [NIST Chemistry WebBook](https://webbook.nist.gov/chemistry/)

### Astronomy
- **Id:** `astronomy`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Catalogues, ephemerides, and mission results. Positions change; the shard is the place for a dated number.
- **Why it is not in the core:** The core has the shape of the system. An ephemeris does not belong in a pack that is not updated nightly.
- **Primary sources opened for this catalog entry:**
  - [NASA Science](https://science.nasa.gov/)
  - [JPL Solar System Dynamics](https://ssd.jpl.nasa.gov/)

### Earth science
- **Id:** `earth-science`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Geology, water, and the measured climate series. A map or a quake catalogue, not a slogan.
- **Why it is not in the core:** Observational series are large and dated. The core keeps the structure of the planet.
- **Primary sources opened for this catalog entry:**
  - [U.S. Geological Survey](https://www.usgs.gov/)
  - [Climate change, NASA Science](https://science.nasa.gov/climate-change/)

### Organisms and taxonomy
- **Id:** `biology-organisms`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Names, ranks, and ranges of living things. Molecular mechanisms stay in the core.
- **Why it is not in the core:** A taxonomy is a database. The core has genetics and evolution, not every species.
- **Primary sources opened for this catalog entry:**
  - [Integrated Taxonomic Information System](https://www.itis.gov/)
  - [Catalogue of Life](https://www.catalogueoflife.org/)
  - [World Register of Marine Species](https://www.marinespecies.org/)
  - [International Plant Names Index](https://www.ipni.org/)

### Mathematics
- **Id:** `mathematics`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Definitions, theorems with their hypotheses, and integer sequences. A proof is not a slogan.
- **Why it is not in the core:** The core has a few results. The rest of mathematics is loaded when the question is a proof or a sequence.
- **Primary sources opened for this catalog entry:**
  - [On-Line Encyclopedia of Integer Sequences](https://oeis.org/)
  - [arXiv](https://arxiv.org/)

### Languages
- **Id:** `languages`
- **Priority:** high
- **Cards:** 0
- **Scope:** Families, grammars, and texts. A language is not inferred from a person's name.
- **Why it is not in the core:** Dictionaries do not fit in the resident pack. The core records that there are many languages. This shard is a language.
- **Primary sources opened for this catalog entry:**
  - [Glottolog](https://glottolog.org/)
  - [World Atlas of Language Structures](https://wals.info/)
  - [Chinese Text Project](https://ctext.org/)
  - [Perseus Digital Library](https://www.perseus.tufts.edu/hopper/)

### Agriculture
- **Id:** `agriculture`
- **Priority:** high
- **Cards:** 0
- **Scope:** Crops, livestock, soils, and food balance sheets from the agencies that publish them.
- **Why it is not in the core:** Practice and yearly statistics are deeper than the core's note that farming had several origins.
- **Primary sources opened for this catalog entry:**
  - [Food and Agriculture Organization](https://www.fao.org/home/en)
  - [International Plant Names Index](https://www.ipni.org/)

### Crafts and practical skills
- **Id:** `crafts-practical`
- **Priority:** high
- **Cards:** 0
- **Scope:** Making and repairing, from manuals and from recorded practice. Load it when someone is actually doing the work.
- **Why it is not in the core:** A workshop manual is useless until the tool is in the hand, and the manuals are long.
- **Primary sources opened for this catalog entry:**
  - [Internet Archive](https://archive.org/)
  - [International Society of Ethnobiology](https://www.ethnobiology.net/)

### Computing
- **Id:** `computing`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Protocols, architectures, and papers. Request for Comments are the text. A product announcement is not a standard.
- **Why it is not in the core:** The core has the packet-network idea and a few machines. The RFC shelf is the depth.
- **Primary sources opened for this catalog entry:**
  - [RFC Editor](https://www.rfc-editor.org/)
  - [arXiv](https://arxiv.org/)

### Economics, the measured series
- **Id:** `economics-data`
- **Priority:** medium
- **Cards:** 0
- **Scope:** National accounts, prices, and trade as the statistical offices publish them. A theory is labelled as a theory.
- **Why it is not in the core:** The figures move. Freezing one year's GDP in the core would make the pack lie next year.
- **Primary sources opened for this catalog entry:**
  - [U.S. Bureau of Economic Analysis](https://www.bea.gov/)
  - [FRED, Federal Reserve Bank of St. Louis](https://fred.stlouisfed.org/)
  - [IMF Data](https://www.imf.org/en/Data)
  - [World Bank Group](https://www.worldbank.org/ext/en/home)

### Religious texts
- **Id:** `religion-texts`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Scriptures and the commentaries traditions actually use, with the tradition named. Disagreements stay side by side.
- **Why it is not in the core:** The texts are long, and a single summary would pick a side. The core does not pretend to be a scripture.
- **Primary sources opened for this catalog entry:**
  - [Sefaria](https://www.sefaria.org/texts)
  - [Chinese Text Project](https://ctext.org/)
  - [Perseus Digital Library](https://www.perseus.tufts.edu/hopper/)

### Arts and music
- **Id:** `arts-music`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Objects, scores, and the documents of making them. A museum's catalogue entry is the source, not a tour guide's mood.
- **Why it is not in the core:** The core names a few works. The collections are the depth.
- **Primary sources opened for this catalog entry:**
  - [Rijksmuseum](https://www.rijksmuseum.nl/en)
  - [Louvre collections](https://collections.louvre.fr/)
  - [IMSLP](https://imslp.org/)

### Food and nutrition
- **Id:** `food-nutrition`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Composition tables and dietary guidance from the agencies that measure them. A diet for a named person is not in the shard.
- **Why it is not in the core:** Nutrient rows are a table. The core does not carry them.
- **Primary sources opened for this catalog entry:**
  - [USDA FoodData Central](https://fdc.nal.usda.gov/)
  - [Food and Agriculture Organization](https://www.fao.org/home/en)
  - [WHO fact sheets](https://www.who.int/news-room/fact-sheets)

### Energy and climate data
- **Id:** `energy-climate-data`
- **Priority:** medium
- **Cards:** 0
- **Scope:** Generation, fuel, and the observational climate series. A policy preference is labelled as someone's policy.
- **Why it is not in the core:** The inventories are yearly. The core keeps the physical claims, not the spreadsheet.
- **Primary sources opened for this catalog entry:**
  - [U.S. Energy Information Administration](https://www.eia.gov/)
  - [Climate change, NASA Science](https://science.nasa.gov/climate-change/)
  - [U.S. Geological Survey](https://www.usgs.gov/)

### Places
- **Id:** `geography-places`
- **Priority:** low
- **Cards:** 0
- **Scope:** Gazetteer names and coordinates. A place name is a record, not a claim about the people who live there.
- **Why it is not in the core:** A gazetteer is a database. The core keeps the ideas of maps and of population, not every town.
- **Primary sources opened for this catalog entry:**
  - [GeoNames](https://www.geonames.org/)
  - [U.S. Geological Survey](https://www.usgs.gov/)

