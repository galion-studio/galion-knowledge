# Population survey: Base World Knowledge Pack

Draft survey of public GitHub projects that can fill knowledge.galion.app V2 from parts that already exist. Every star count, SPDX id, language field, default branch, archive flag, and push date below was read from the GitHub repository API on 18 November 2026. Functional sentences were checked against that repository’s README, or against a source file named in the sentence, on the same day. Where the README and the API disagree, both are stated.

A code licence is not a data licence. `null` from the licence API means GitHub returned no SPDX id. `NOASSERTION` means GitHub found a licence file and refused to map it. Those two results are not the same, and neither one is permission to copy the code.

This file is a survey only. It does not add ingest code, change the running site, or authorise a deploy.

## What a card is

One card is one claim:

- claim text, copied or tightly paraphrased from a span that exists in a source
- source locator: URI plus page, paragraph, or byte offset
- date of the source
- `said_by`: the author, body, or newspaper named on that source
- evidence strength
- kind: `fact`, `opinion`, or `contested`
- contested views: other cards that share an event or question and disagree
- pack: `core` or `shard:<id>`

No span, no card. An abstention is a queue item.

## Owner constraints

The Base World Knowledge Pack is only the core. The owner’s size band is about 50,000 to 200,000 well-sourced cards. That number is a target, not a yield measured from these tools. Specialist medicine, the statute book of one country, and niche science are optional shards. When HORBM answers “I don’t know”, that question enters a queue. The queue does not invent a card.

Wikipedia prose is out of scope, and so is anything built by rewriting it. The preferred inputs are original documents and scans, peer-reviewed papers and their data, official measurement publications, and more than one national archive for contested history. Wikidata is an identifier crosswalk only. Wikisource is in scope only as a transcription of a named primary, with the scan or edition kept as the source.

Rust is the language of the card spine where a maintained, licensed crate already does the job. Java and Python stay sidecars where they are the real extractor. AGPL, GPL, and EUPL programs are called over HTTP and are not linked into the MIT application.

## Top 10

These are the pieces the pipeline below actually assembles. Popularity is not the ranking.

1. **[grobidOrg/grobid](https://github.com/grobidOrg/grobid)** — 5,234 stars, Apache-2.0, Java, default branch `master`, pushed 2026-11-18. The README describes a machine-learning library that turns a scholarly PDF into structured XML/TEI: header metadata, parsed references, citation-context resolution, full-text structure (paragraphs, section titles, reference callouts), and PDF coordinates for the extracted spans. It can consolidate a reference against the Crossref REST API. The README reports citation-context F1 between .76 and .91 depending on the collection, so a span is a candidate with a coordinate, not an unchecked fact. This is the extractor a paper card quotes. Measurements printed in a paper, rather than in the CODATA table, go through [lfoppiano/grobid-quantities](https://github.com/lfoppiano/grobid-quantities) (85 stars, Apache-2.0, pushed 2026-09-13). That README opens with “Work in progress,” describes a Java module that normalises a measurement to SI, and names release 0.8.2. GitHub’s language field is JavaScript (46% of bytes); Java is 38%.

2. **[vmagnin/fundamental_constants](https://github.com/vmagnin/fundamental_constants)** — 16 stars, MIT, language field Fortran, default branch `main`, pushed 2025-05-05. This is the reader for the official constants table. The README and `nist.py` download NIST’s ASCII file of CODATA recommended values, generate a Fortran module, and check the printed digits against that file. For the 2022 adjustment, `nist.py` uses `https://physics.nist.gov/cuu/Constants/Table/allascii.txt`. The same script has the 2018, 2014, and 2010 archive URLs. That 2022 file was fetched on 18 November 2026. Its header reads “2022 CODATA adjustment” and “From: http://physics.nist.gov/constants”, and it has 355 data rows. A card quotes one row. `said_by` is the 2022 CODATA adjustment named in the header. The source URI is the NIST file. The generated Fortran is not the source. [MilanSkocic/codata](https://github.com/MilanSkocic/codata) (10 stars, MIT, Fortran, pushed 2026-10-24) ships the 2022, 2018, 2014, and 2010 sets with C and Python bindings and tells the caller to pin the year, because an unsuffixed “current” alias moves when a new adjustment is released. Its README does not name the NIST file, so it is a second copy for a digit check, not the provenance path. [JonasOlson/rust-physical_constants](https://github.com/JonasOlson/rust-physical_constants) (4 stars, GPL-3.0, Rust, pushed 2026-11-11) embeds the 2022 table and is not linked. [DrGrafil/NISTConst](https://github.com/DrGrafil/NISTConst) (5 stars, MIT, C++, pushed 2018-12-07) is frozen to the 2014 adjustment (DOI `10.1063/1.4954402` in its README) and is why a vendored header is not the source.

3. **[J535D165/pyalex](https://github.com/J535D165/pyalex)** — 434 stars, MIT, Python, default branch `main`, pushed 2026-10-05. The README describes a thin client for OpenAlex entities: works, authors, sources, institutions, concepts, topics, publishers, and funders, with filter, search, and semantic search. OpenAlex is the allowlist index. The card still needs a span in the paper. The Rust module [0x6e66/openalex](https://github.com/0x6e66/openalex) (1 star, no SPDX id, pushed 2024-08-14, “A rust module to to access metadata from openalex.org”) is not a replacement.

4. **[mattsse/crossref-rs](https://github.com/mattsse/crossref-rs)**, kept honest by **[sckott/habanero](https://github.com/sckott/habanero)** — crossref-rs has 21 stars, Apache-2.0, Rust, pushed 2024-03-22. Its README lists routes for works, members, prefixes, funders, journals, types, and DOI agency, and says the client is inspired by habanero. habanero has 253 stars, MIT, Python, pushed 2026-10-25. Its README says a query searches the metadata Crossref returns (titles, authors, and similar fields), not the full text and not the abstract, and that a `mailto` puts the client in the polite pool. A newer Rust CLI, [TonyWu20/crossref-rs](https://github.com/TonyWu20/crossref-rs) (0 stars, MIT, pushed 2026-06-11), is not the client this pipeline uses. DOI metadata comes from crossref-rs; when a route or a bug has moved on since March 2024, habanero is the maintained sidecar.

5. **Chronicling America, via the Library of Congress.** [LibraryOfCongress/data-exploration](https://github.com/LibraryOfCongress/data-exploration) (236 stars, CC0-1.0, Jupyter Notebook, pushed 2026-04-23) is notebooks and scripts against the loc.gov APIs. [LibraryOfCongress/newspaper-navigator](https://github.com/LibraryOfCongress/newspaper-navigator) (272 stars, Unlicense, Jupyter Notebook, pushed 2025-07-07, archived) documents how those newspaper files are laid out. The README, by Benjamin Charles Germain Lee, says the project is an experiment with no active development or maintenance. It processed 16,368,041 Chronicling America pages. The dataset it publishes is visual content (headlines, photographs, illustrations, maps, comics, cartoons, advertisements) plus captions taken from METS/ALTO OCR inside predicted boxes. The same pipeline downloads the page image and the OCR. History cards use that page image and that OCR file. The bounding-box dataset is a finding aid. The README points at Chronicling America, the National Digital Newspaper Program, and the dataset paper at `https://arxiv.org/abs/2005.01583`.

6. **[usnationalarchives/Catalog-API](https://github.com/usnationalarchives/Catalog-API)** — 171 stars, no SPDX id, Python, pushed 2026-05-01. The README is documentation for the National Archives Catalog API: archival descriptions, authority records, digital-object metadata, public contributions, and extracted text such as OCR. The API can also post tags and transcriptions. This pipeline only reads. Call `https://catalog.archives.gov`. Do not copy the repository. This is a second US institutional memory, distinct from the Library of Congress.

7. **Europeana and Gallica, over HTTP.** [europeana/api2](https://github.com/europeana/api2) (30 stars, EUPL-1.2, Java, default branch `develop`, pushed 2026-11-17) has the repository description “Europeana's Search and Record API.” [ian-nai/PyGallica](https://github.com/ian-nai/PyGallica) (22 stars, GPL-3.0, Python, pushed 2023-04-10, archived) has the repository description “A Python wrapper for the National Library of France's Gallica API.” Leave both codebases out of the MIT binary and call the public APIs. With the Library of Congress and the US National Archives, the history slice then has US newspapers, US government records, Europeana’s aggregated holdings, and the National Library of France. A search for a BIPM client returned [kakao-bob/bipmp](https://github.com/kakao-bob/bipmp), a one-star Rust tool for a grayscale image format named BIP, which is not the Bureau International des Poids et Mesures.

8. **[Nanopublication/nanopub-rs](https://github.com/Nanopublication/nanopub-rs)** — 25 stars, MIT, Rust (75% of bytes), default branch `main`, pushed 2026-10-29. The README and the crate docs say the library signs, publishes, and checks nanopublications, with a Rust crate, a Python package (`nanopub-sign`), a JavaScript/WASM package, and a CLI. `lib/src/vocab.rs` defines the three graphs `np:Assertion`, `np:Provenance`, and `np:PublicationInfo`. The pipeline writes one card as one nanopublication, with the claim in the assertion graph, the source and the span in the provenance graph, and the pack id in the publication-info graph. The nanopub.net description, linked from the README, calls a nanopublication a small RDF graph with provenance, identified by a content hash and signed by its creator.

9. **[serega/gaoya](https://github.com/serega/gaoya)** — 83 stars, MIT, Rust, pushed 2026-11-14. The README implements locality-sensitive hashing for deduplicating and clustering text: 64/32/16/8-bit MinHash, 64- and 128-bit SimHash, and Python bindings. Near-duplicate claim text collapses only when `said_by` and the source are the same. Two opposing sentences about one event share an event id and stay two cards.

10. **[jedireza/warc](https://github.com/jedireza/warc)** — 61 stars, MIT, Rust, pushed 2024-11-27. The README is a library for reading and writing WARC files. [chatnoir-eu/chatnoir-resiliparse](https://github.com/chatnoir-eu/chatnoir-resiliparse) (154 stars, Apache-2.0, Rust, default branch `develop`, pushed 2026-11-04) adds parsing, content extraction, and boilerplate removal, with Python bindings, for web-archive data. Both run on archive files already chosen from the Library of Congress, the National Archives, Europeana, Gallica, or Archive.org. An open web crawl is not a source. [internetarchive/brozzler](https://github.com/internetarchive/brozzler) (824 stars, Apache-2.0, Python, pushed 2026-11-18) is a distributed browser-based web crawler, and it stays unused.

## Recommended pipeline

### Rust spine, and the sidecars it does not replace

Link these into the MIT application:

| Crate | Job |
| --- | --- |
| `mattsse/crossref-rs` | DOI metadata. Fall back to habanero for a route the 2024 client does not cover. |
| `revidiumhq/biblib` | Parse RIS, PubMed/MEDLINE, BibTeX, and the other formats its README lists into one `Citation` record, then deduplicate records that share a DOI or PMID. This is bibliographic identity, not claim-text identity. 10 stars, Apache-2.0, Rust, pushed 2026-10-11. |
| `serega/gaoya` | Near-duplicate claim text, after the identifier pass. |
| `jedireza/warc` | Read a WARC that was fetched because a catalog record pointed at it. |
| `Nanopublication/nanopub-rs` | Sign and store the card. |

Leave these as sidecars. Rewriting them would be a new stack:

| Program | Why it stays |
| --- | --- |
| GROBID and grobid-quantities | The PDF extractor. Java, Apache-2.0. Call the GROBID web service. [grobidOrg/grobid-client-python](https://github.com/grobidOrg/grobid-client-python) (417 stars, Apache-2.0, pushed 2026-11-10) is the Python client for that service. grobid-quantities is the work-in-progress measurement normaliser, used on papers, not on the CODATA table. |
| `vmagnin/fundamental_constants` (`nist.py`) | MIT Python script that downloads the NIST CODATA ASCII table and checks digits. Run the script, or read the same URLs. Do not link the Fortran it generates. |
| pyalex | The OpenAlex allowlist. The licensed Rust alternative was not found. |
| habanero | The maintained Crossref metadata client. |
| [trungdong/prov](https://github.com/trungdong/prov) | Export, not the writer. 149 stars, MIT, Python, default branch `main`, pushed 2026-11-18. The README implements the W3C PROV Data Model and serialises PROV-N, PROV-JSON, PROV-JSONLD, PROV-XML, and PROV-O. |
| [CLARIAH/COW](https://github.com/CLARIAH/COW) | Optional audit trail. 48 stars, MIT, Python, default branch `base`, pushed 2024-05-06. The README converts CSV to RDF with CSVW and emits nanopublications. |
| [shmsw25/FActScore](https://github.com/shmsw25/FActScore) | Checker, not writer. See the gap queue. |

Call these over HTTP. Do not link the code: Congress.gov, the National Archives Catalog, Europeana, Gallica, Archive.org, Open Library, Zenodo.

### 1. Core first

Allowlist, not a crawl. Build the six slices in this order. A measurement table, a method note, and a linguistics cap are small on purpose. The band fills from Earth and life mechanisms and from paired history documents. If a slice would push the pack past the band, narrow that allowlist. Shard material does not backfill the core.

1. **Constants and physical laws.** Numerical recommended values come from the NIST ASCII table that `vmagnin/fundamental_constants` already downloads (`allascii.txt` for 2022, and the archive files for 2018, 2014, and 2010). The 2022 file, fetched on 18 November 2026, is headed “2022 CODATA adjustment” and contains 355 data rows. One row is one card: quantity, value, uncertainty, unit, adjustment year. `said_by` is the adjustment named in that header. Evidence strength is `measurement`. Pin the year. Do not follow an unsuffixed “latest” alias, which [MilanSkocic/codata](https://github.com/MilanSkocic/codata) documents as a value that changes when a new adjustment is published. Do not link the GPL Rust embed, and do not import the 2014 header in NISTConst. Definitional prose (the SI brochure, the adjustment paper) is a PDF found by DOI and read with GROBID, so the sentence that states the definition has a page coordinate. grobid-quantities is for a measurement printed in some other paper. It is marked work in progress, so that card keeps the PDF coordinate of the expression. A name search for CODATA also returns SAP OData guides, a product named Codata, and CODATA-RDA school materials. Those are not this table.

2. **Earth and life, at mechanism depth.** pyalex topic allowlist for the mechanisms the core actually teaches (cell, photosynthesis, plate tectonics, orbital mechanics, and a short list of the same kind). Topics that are specialist medicine go to the medicine shard and are not downloaded here. Crossref supplies authors and date from metadata. GROBID supplies a body span that it has tied to a reference callout, with a PDF coordinate. The card quotes that span and points at the DOI and the coordinate. Store the quotation and the locator. Store the full text only after that provider’s terms have been read and allow it. Those terms were not read in this pass. [allenai/s2orc-doc2json](https://github.com/allenai/s2orc-doc2json) (478 stars, Apache-2.0, Python, pushed 2024-04-11, “Parsers for scientific papers (PDF2JSON, TEX2JSON, JATS2JSON)”) is the fallback when GROBID misses a PDF or a TeX source.

3. **Main history, both sides.** More than one national memory. Library of Congress collection APIs, using the `data-exploration` notebooks as the calling pattern, and Chronicling America page images plus METS/ALTO OCR, using Newspaper Navigator as the documented layout rather than as a service. National Archives Catalog API for US government records and their digital objects. Europeana’s HTTP API for European holdings. Gallica’s HTTP API for the National Library of France. Archive.org over HTTP when a catalog record identifies a scan. [jjjake/internetarchive](https://github.com/jjjake/internetarchive) (1,933 stars, AGPL-3.0, pushed 2026-11-17) is the Archive.org client and stays unlinked. A card’s source is the page image plus the OCR or the transcription. The same date and place in two newspapers produces two cards linked by an event id. [alex9smith/gdelt-doc-api](https://github.com/alex9smith/gdelt-doc-api) (234 stars, MIT, Python, pushed 2025-04-22) may suggest a URL. The GDELT row is not the claim.

4. **Money, power, and law as mechanisms.** [LibraryOfCongress/api.congress.gov](https://github.com/LibraryOfCongress/api.congress.gov) (1,015 stars, no SPDX id, language field Java, pushed 2026-11-16) is documentation and sample clients for the Congress.gov API, version 3. The README requires an API key, sets a rate limit of 5,000 requests per hour, and returns XML or JSON. The bill-endpoint documentation describes a text level whose payload is URLs to text versions on congress.gov. The documented format types are Formatted Text, PDF, and Formatted XML; a sample response in the repository also includes Generated HTML. The same document says the law endpoints retrieve bill data by Congress, public or private law, and law number, and that the law number is the one assigned by the National Archives. Quote the official text file those URLs point at. Add a handful of constitutional or charter documents from the archives, under the same span rule. Do not download a country’s code. Do not copy the sample Java or Python clients; the repository has no SPDX id. Bytes in the repo are about 60% Java and 37% Python, which describes the samples, not a statute corpus.

5. **Epistemology.** A small set of cards whose text is the grading rule used in the steps above (a measurement-body table outranks a preprint; a page image outranks a caption extracted from a box; two newspapers stay two cards). Each card cites the method document those steps actually followed. These cards are how HORBM explains a source.

6. **How to talk with people.** pyalex topic filter for peer-reviewed communication and linguistics, with a hard cap, and the same GROBID span rule. Default kind is `opinion` or `contested` unless the paper reports a measurement. Advice columns and blogs are not a source.

Write each accepted card with nanopub-rs. A CSV stage can be batch-converted with COW (branch `base`) so a reviewer can diff the table. A PROV-O export, if a consumer needs W3C PROV rather than a nanopublication, goes through `trungdong/prov`.

Dedup inside the core in this order: DOI, PMID, arXiv id, the item identifier the loc.gov API returns, the Archive.org identifier, the congress.gov bill or law number, the catalog record identifier the National Archives API returns, then normalised claim text via gaoya. biblib handles the citation-record half of that list. gaoya handles the sentence half. Do not merge cards that differ in `said_by`.

Stop inside the owner’s band. The first build reports a real count per slice.

### 2. Shards second

Same writer. `pack` is `shard:<id>`. A shard card does not move into `core` because a paper exists.

| Shard | Pieces | Boundary |
| --- | --- | --- |
| `shard:medicine` | [genomoncology/biomcp](https://github.com/genomoncology/biomcp) (683 stars, MIT, Rust 77% / Python 21%, pushed 2026-11-10) | The README describes one CLI that searches articles across PubTator3, Europe PMC, and PubMed, and names ClinVar, ClinicalTrials.gov, and others among 72 sources. It also says those sources’ terms govern the data and that some restrict commercial or clinical use. The per-source file was not read. Medicine stays in this shard. [Zenleaf/entrez-rs](https://github.com/Zenleaf/entrez-rs) (20 stars, no SPDX id, Rust, pushed 2022-12-08) wraps Entrez and its README shows a PubMed search; do not copy it. |
| `shard:law-<country>` | That country’s official gazette or legislature API, found when the shard is opened | congress.gov does not stand in for another country. |
| `shard:science-<topic>` | pyalex, Crossref, GROBID, and optionally [TIBHannover/orkg-backend](https://github.com/TIBHannover/orkg-backend) (6 stars, MIT, Kotlin, pushed 2026-11-12) | The ORKG repository’s description says it is a read-only mirror of the GitLab backend. Import a comparison cell only when the cell still cites a paper. [sciknoworg/llm-atlas](https://github.com/sciknoworg/llm-atlas) (3 stars, MIT, pushed 2026-10-21) has the repository description “Automated extraction and validation of structured knowledge about large language and vision-language models from scientific papers, with integration into the Open Research Knowledge Graph (ORKG).” That is an example of a loader. It is not the core writer, because a model can invent a span. |
| `shard:data` | Zenodo’s public API; [ncbi/datasets](https://github.com/ncbi/datasets) | A dataset supports a claim. It is not prose. ncbi/datasets (566 stars, NOASSERTION, language field Jupyter Notebook, Go 41% of bytes, pushed 2026-11-13) is a CLI for sequence, annotation, and genome metadata. The README’s example downloads the human reference genome GRCh38. It is not a PubMed client. Zenodo’s server [zenodo/zenodo-rdm](https://github.com/zenodo/zenodo-rdm) is GPL-3.0 (358 stars, pushed 2026-11-17). Call the API. |
| `shard:preprints` | [lukasschwab/arxiv.py](https://github.com/lukasschwab/arxiv.py) (1,567 stars, MIT, pushed 2026-11-14) | A preprint is lower evidence than a reviewed paper. [neoncitylights/arxiv](https://github.com/neoncitylights/arxiv) (1 star, Apache-2.0, Rust, pushed 2026-02-01) has the repository description “A Rust crate to parse arXiv identifiers and references.” [arthiondaena/arxivETL_sync](https://github.com/arthiondaena/arxivETL_sync) (8 stars, MIT, Rust, pushed 2026-07-11) describes a parallel Rust and Python ETL of arXiv LaTeX from requester-pays AWS S3 into Parquet on Hugging Face. That is full text for this shard, not the core’s first cut. |

[allenai/s2orc](https://github.com/allenai/s2orc) (1,094 stars, no SPDX id on the code repository, Python, pushed 2024-04-26) is a paper corpus. Its README states that the corpus is released under ODC-By 1.0 and that use agrees to that licence. The ODC-By deed itself was not read here. Do not copy the code. Do not bulk-load the text until that deed has been read. The README says current access is the Semantic Scholar bulk dataset. [danielnsilva/semanticscholar](https://github.com/danielnsilva/semanticscholar) (485 stars, MIT, Python, pushed 2026-08-01) is an unofficial client for those APIs.

### 3. Gap queue third

HORBM already abstains with “I don’t know”. That string is the intake. The queue is the only way a new core card appears after the first build, and only when a primary span exists.

1. Log `{question, asked_at, guessed_pack}`. This is not a card.
2. A worker searches only that pack’s allowlist. Science and epistemology: OpenAlex and Crossref, then GROBID on a paper the index returns. US law mechanisms: the Congress.gov text URLs. History: Chronicling America, the National Archives Catalog, Europeana, Gallica, and Archive.org for an identified scan.
3. A hit with a span becomes a `core` card when the question still falls in one of the six slices and the core is still inside the band. Otherwise it becomes a shard card.
4. A miss stays “I don’t know”. The queue item remains and rises if the question repeats. Nothing is generated to close it.
5. FActScore, if it is run, scores a candidate against the primary-span database only. The README says the default knowledge source is the Wikipedia dump of 2023/04/01, that the stock prompt entities are Wikipedia person-titles, and that a custom source is a JSONL of `title` and `text` registered with `register_knowledge_source`. The ACL Anthology preprocessing script is the README’s example of a non-Wikipedia source. The Wikipedia dump is not downloaded. The README’s abstain flag is optional and off by default; the built-in detectors it names are `generic` and `perplexity_ai`, and an empty `output` string is the other way it documents an abstention. An abstention maps to step 4. The atomic splitter is a model and can cut a sentence in a place the source does not. GROBID spans remain the writer.

## Survey

### Scholarly metadata and full text

These feed core slices 1, 2, 4, 5, and 6, and later the science shards.

| Repository | Stars | Licence | Language field | Pushed | What it actually is |
| --- | --- | --- | --- | --- | --- |
| [grobidOrg/grobid](https://github.com/grobidOrg/grobid) | 5,234 | Apache-2.0 | Java | 2026-11-18 | PDF to structured scholarly XML, with citation contexts and PDF coordinates. |
| [grobidOrg/grobid-client-python](https://github.com/grobidOrg/grobid-client-python) | 417 | Apache-2.0 | Python | 2026-11-10 | API description: “Python client for GROBID Web services.” |
| [lfoppiano/grobid-quantities](https://github.com/lfoppiano/grobid-quantities) | 85 | Apache-2.0 | JavaScript | 2026-09-13 | Java GROBID module, marked work in progress, for measurements normalised to SI. Not the CODATA table. |
| [vmagnin/fundamental_constants](https://github.com/vmagnin/fundamental_constants) | 16 | MIT | Fortran | 2025-05-05 | `nist.py` downloads the NIST CODATA ASCII table (2022, 2018, 2014, 2010) and checks the generated digits. The table is the source. |
| [MilanSkocic/codata](https://github.com/MilanSkocic/codata) | 10 | MIT | Fortran | 2026-10-24 | README: CODATA 2022, 2018, 2014, and 2010, with C and Python bindings. Pin the year. A second copy, not the provenance path. |
| [JonasOlson/rust-physical_constants](https://github.com/JonasOlson/rust-physical_constants) | 4 | GPL-3.0 | Rust | 2026-11-11 | README: CODATA 2022 values as `f64`. Do not link. |
| [DrGrafil/NISTConst](https://github.com/DrGrafil/NISTConst) | 5 | MIT | C++ | 2018-12-07 | README: 335 constants, frozen to CODATA 2014. Not the current table. |
| [kofron/CODATA.jl](https://github.com/kofron/CODATA.jl) | 1 | NOASSERTION | Julia | 2014-08-12 | README: the 2010 CODATA values. Not copied. |
| [dmcclean/dimensional-codata](https://github.com/dmcclean/dimensional-codata) | 2 | BSD-3-Clause | Haskell | 2021-05-01 | README: a subset of the 2014 values, for the Haskell `dimensional` library. Not the current table. |
| [J535D165/pyalex](https://github.com/J535D165/pyalex) | 434 | MIT | Python | 2026-10-05 | OpenAlex client. Index, not the claim text. |
| [ourresearch/openalex-guts](https://github.com/ourresearch/openalex-guts) | 158 | MIT | Python | 2026-03-06 | API description: “The guts for computing data for OpenAlex.” Upstream of the index, not a card store. |
| [ourresearch/openalex-api-tutorials](https://github.com/ourresearch/openalex-api-tutorials) | 151 | MIT | Jupyter Notebook | 2024-04-25 | Jupyter notebooks of bibliometric examples against the OpenAlex API. |
| [sckott/habanero](https://github.com/sckott/habanero) | 253 | MIT | Python | 2026-10-25 | Crossref metadata client. README: queries do not search full text. |
| [mattsse/crossref-rs](https://github.com/mattsse/crossref-rs) | 21 | Apache-2.0 | Rust | 2024-03-22 | Rust Crossref client for the routes listed above. Last push March 2024. |
| [lukasschwab/arxiv.py](https://github.com/lukasschwab/arxiv.py) | 1,567 | MIT | Python | 2026-11-14 | API description: “Python wrapper for the arXiv API.” Preprint shard. |
| [neoncitylights/arxiv](https://github.com/neoncitylights/arxiv) | 1 | Apache-2.0 | Rust | 2026-02-01 | Repository description: a Rust crate to parse arXiv identifiers and references. |
| [arthiondaena/arxivETL_sync](https://github.com/arthiondaena/arxivETL_sync) | 8 | MIT | Rust | 2026-07-11 | Repository description: parallel ETL of arXiv LaTeX from requester-pays S3 into Parquet. |
| [allenai/s2orc-doc2json](https://github.com/allenai/s2orc-doc2json) | 478 | Apache-2.0 | Python | 2024-04-11 | Repository description: parsers for scientific papers (PDF2JSON, TEX2JSON, JATS2JSON). |
| [allenai/s2orc](https://github.com/allenai/s2orc) | 1,094 | no SPDX id | Python | 2024-04-26 | README: corpus under ODC-By 1.0. Code repository has no SPDX id. |
| [danielnsilva/semanticscholar](https://github.com/danielnsilva/semanticscholar) | 485 | MIT | Python | 2026-08-01 | Repository description: unofficial Python client for the Semantic Scholar APIs. |
| [ncbi/datasets](https://github.com/ncbi/datasets) | 566 | NOASSERTION | Jupyter Notebook | 2026-11-13 | README: CLI for genomes, genes, sequence, and annotation. Not the literature. |
| [genomoncology/biomcp](https://github.com/genomoncology/biomcp) | 683 | MIT | Rust | 2026-11-10 | README: biomedical CLI including PubMed. Medicine shard. Data terms are the upstream sources’. |
| [Zenleaf/entrez-rs](https://github.com/Zenleaf/entrez-rs) | 20 | no SPDX id | Rust | 2022-12-08 | README: Entrez wrapper, with a PubMed example. Stale, no SPDX id. |
| [revidiumhq/biblib](https://github.com/revidiumhq/biblib) | 10 | Apache-2.0 | Rust | 2026-10-11 | README: citation parsers and citation dedup. |
| [hongkongkiwi/research-master](https://github.com/hongkongkiwi/research-master) | 4 | MIT | Rust | 2026-11-12 | Repository description: “MCP to help search academic research papers via LLM.” Too small to be the client. |
| [TIBHannover/orkg-backend](https://github.com/TIBHannover/orkg-backend) | 6 | MIT | Kotlin | 2026-11-12 | Repository description: read-only mirror of the GitLab ORKG backend. |
| [TIBHannover/orkg-nlp-pypi](https://github.com/TIBHannover/orkg-nlp-pypi) | 4 | MIT | Python | 2023-06-30 | Repository description: read-only mirror of the GitLab ORKG NLP package. |
| [zenodo/zenodo-rdm](https://github.com/zenodo/zenodo-rdm) | 358 | GPL-3.0 | Python | 2026-11-17 | API description: “Zenodo, powered by InvenioRDM.” Call the public API. |
| [cthoyt/zenodo-client](https://github.com/cthoyt/zenodo-client) | 47 | MIT | Python | 2026-04-13 | API description: upload and version-management client for Zenodo. |

### Archives and official texts

| Repository | Stars | Licence | Language field | Pushed | What it actually is |
| --- | --- | --- | --- | --- | --- |
| [LibraryOfCongress/api.congress.gov](https://github.com/LibraryOfCongress/api.congress.gov) | 1,015 | no SPDX id | Java | 2026-11-16 | API documentation and sample clients. Bill text is a URL on congress.gov. |
| [LibraryOfCongress/data-exploration](https://github.com/LibraryOfCongress/data-exploration) | 236 | CC0-1.0 | Jupyter Notebook | 2026-04-23 | Notebooks against loc.gov APIs. |
| [LibraryOfCongress/newspaper-navigator](https://github.com/LibraryOfCongress/newspaper-navigator) | 272 | Unlicense | Jupyter Notebook | 2025-07-07 | Archived. Visual-content dataset over 16,368,041 Chronicling America pages, and the method for downloading the page and the METS/ALTO OCR. |
| [LibraryOfCongress/concordia](https://github.com/LibraryOfCongress/concordia) | 175 | NOASSERTION | Python | 2026-11-18 | Repository description: crowdsourcing platform for full-text transcription and tagging at crowd.loc.gov. Not a claim graph. |
| [usnationalarchives/Catalog-API](https://github.com/usnationalarchives/Catalog-API) | 171 | no SPDX id | Python | 2026-05-01 | Documentation of the National Archives Catalog API. Read it over HTTP. |
| [europeana/api2](https://github.com/europeana/api2) | 30 | EUPL-1.2 | Java | 2026-11-17 | Europeana search and record API. HTTP only. Default branch `develop`. |
| [europeana/rd-europeana-python-api](https://github.com/europeana/rd-europeana-python-api) | 9 | EUPL-1.2 | Python | 2023-11-08 | API description: “Python API for Europeana.” Same licence limit. |
| [ian-nai/PyGallica](https://github.com/ian-nai/PyGallica) | 22 | GPL-3.0 | Python | 2023-04-10 | Archived wrapper for the Gallica API. Call Gallica. Do not link the wrapper. |
| [jjjake/internetarchive](https://github.com/jjjake/internetarchive) | 1,933 | AGPL-3.0 | Python | 2026-11-17 | Archive.org client. HTTP only. |
| [internetarchive/openlibrary](https://github.com/internetarchive/openlibrary) | 6,930 | AGPL-3.0 | Python | 2026-11-18 | API description: “One webpage for every book ever published!” A catalogue. Each book’s rights were not read. The AGPL application stays unlinked. |
| [internetarchive/openlibrary-client](https://github.com/internetarchive/openlibrary-client) | 511 | AGPL-3.0 | Python | 2026-10-08 | Repository description: Python client library for the Open Library API. |
| [jedireza/warc](https://github.com/jedireza/warc) | 61 | MIT | Rust | 2024-11-27 | Read and write WARC. |
| [maxcountryman/warc-parquet](https://github.com/maxcountryman/warc-parquet) | 117 | MIT | Rust | 2025-02-12 | API description: CLI that converts WARC to Parquet. |
| [chatnoir-eu/chatnoir-resiliparse](https://github.com/chatnoir-eu/chatnoir-resiliparse) | 154 | Apache-2.0 | Rust | 2026-11-04 | Web-archive parsing and extraction. Chosen files only. Default branch `develop`. |
| [chfoo/warcat-rs](https://github.com/chfoo/warcat-rs) | 34 | MPL-2.0 | Rust | 2025-06-02 | API description: WARC CLI and library. MPL is file-level copyleft. |

### Claim checking, and the sets that are not sources

[shmsw25/FActScore](https://github.com/shmsw25/FActScore) (464 stars, MIT, Python, pushed 2025-04-13) is the EMNLP 2023 scorer, paper `https://arxiv.org/abs/2305.14251`. Its default knowledge source and its stock entity lists are Wikipedia. The custom-source path is the only path that fits this pack, and only against spans we already hold. It does not write cards.

[utaresearch/claimbuster-spotter](https://github.com/utaresearch/claimbuster-spotter) (87 stars, GPL-3.0, Python, pushed 2023-11-29) is described as adversarial training to discover check-worthy claims. The idea, score a sentence then require a span, fits the core filter. The GPL code stays unlinked.

[awslabs/fever](https://github.com/awslabs/fever) (130 stars, Apache-2.0, language field HTML, pushed 2026-02-20) is the FEVER annotation platform. The README says the dataset “consists of 185,441 claims generated by altering sentences extracted from Wikipedia”. That is a Wikipedia derivative. It is not a knowledge source. [sheffieldnlp/naacl2018-fever](https://github.com/sheffieldnlp/naacl2018-fever) (129 stars, Apache-2.0, Python, pushed 2023-02-03, archived) is the baseline and is rejected on the same ground. The label shape the paper uses (claim, evidence span, supported or refuted or not enough info) is the shape a primary span can fill. The Wikipedia sentences are not reused.

[MichSchli/AVeriTeC](https://github.com/MichSchli/AVeriTeC) (84 stars, no SPDX id, Python, pushed 2024-11-27) maintains the dataset from the paper “A Dataset for Real-world Claim Verification with Evidence from the Web”. The README’s record includes the claim, a speaker, a fact-checking article, a source URL, and an archive.org cache of that URL. The evidence is web text gathered for a fact-check. It is not a primary corpus, and it is not imported. [ssu-humane/HerO](https://github.com/ssu-humane/HerO) (15 stars, no SPDX id, pushed 2025-03-18) has the repository description “a fact-checking pipeline based on open LLMs (the runner-up in AVeriTeC).” Reference only.

[openfactcheck-research/openfactcheck](https://github.com/openfactcheck-research/openfactcheck) (32 stars, AGPL-3.0, pushed 2026-08-15) is an LLM factuality demo. Do not link it. [yuxiaw/OpenFactCheck](https://github.com/yuxiaw/OpenFactCheck) (65 stars, no SPDX id, pushed 2024-06-07) is an earlier tree with no SPDX id.

ClaimReview is a contested annotation. `said_by` is the checker, not the event. [MartinoMensio/claimreview-collector](https://github.com/MartinoMensio/claimreview-collector) (3 stars, no SPDX id, Jupyter Notebook, pushed 2026-11-16) has the repository description “dataset processing part of https://github.com/MartinoMensio/MisinfoMe”. [MartinoMensio/claimreview-data](https://github.com/MartinoMensio/claimreview-data) (7 stars, NOASSERTION, pushed 2026-11-18) has no API description. [admataz/wp-factchecker-claim-review](https://github.com/admataz/wp-factchecker-claim-review) (10 stars, no SPDX id, PHP, pushed 2017-08-24) is a WordPress plugin for Schema.org ClaimReview markup. It documents a shape. It is not a source of truth.

A search for AllSides on 18 November 2026 returned scrapers of media-bias ratings, the largest being [favstats/AllSideR](https://github.com/favstats/AllSideR) (25 stars, GPL-3.0, “Media Bias Ratings from AllSides.com”). A bias rating is not a primary, and it is not imported. Perspective is two primaries kept side by side.

[linwoodc3/gdeltPyR](https://github.com/linwoodc3/gdeltPyR) (260 stars, GPL-3.0, Jupyter Notebook, pushed 2023-11-30) retrieves GDELT event data. Event codes are not claims, and the GPL client stays unlinked.

### Provenance

| Repository | Stars | Licence | Language field | Pushed | What it actually is |
| --- | --- | --- | --- | --- | --- |
| [Nanopublication/nanopub-rs](https://github.com/Nanopublication/nanopub-rs) | 25 | MIT | Rust | 2026-10-29 | Sign, publish, and check nanopublications. Assertion, provenance, and publication-info graphs are in the crate vocabulary. |
| [Nanopublication/nanopub-py](https://github.com/Nanopublication/nanopub-py) | 38 | Apache-2.0 | Python | 2026-11-17 | Repository description: Python client for searching, publishing and modifying nanopublications. |
| [Nanopublication/nanopub-java](https://github.com/Nanopublication/nanopub-java) | 33 | MIT | Java | 2026-11-18 | API description: Java library for nanopublications based on RDF4J. |
| [knowledgepixels/nanodash](https://github.com/knowledgepixels/nanodash) | 43 | AGPL-3.0 | Java | 2026-11-18 | API description: web client to browse and publish nanopublications. Do not embed. |
| [CLARIAH/COW](https://github.com/CLARIAH/COW) | 48 | MIT | Python | 2024-05-06 | CSV to nanopublications. Default branch `base`. |
| [trungdong/prov](https://github.com/trungdong/prov) | 149 | MIT | Python | 2026-11-18 | W3C PROV-DM, including PROV-O export. |

### Dedup

Exact identifiers first, then near-duplicate text, and never across a different `said_by`.

| Repository | Stars | Licence | Language field | Pushed | What it actually is |
| --- | --- | --- | --- | --- | --- |
| [serega/gaoya](https://github.com/serega/gaoya) | 83 | MIT | Rust | 2026-11-14 | MinHash and SimHash LSH, with Python bindings. First choice inside the MIT app. |
| [hirosassa/doubri-rs](https://github.com/hirosassa/doubri-rs) | 4 | MIT | Rust | 2026-11-03 | API description: MinHash LSH document dedup. Small and current. |
| [dipeshbabu/pari](https://github.com/dipeshbabu/pari) | 7 | MIT | Rust | 2026-11-18 | API description: similarity index with Rust, Python, and a CLI. |
| [google-research/deduplicate-text-datasets](https://github.com/google-research/deduplicate-text-datasets) | 1,274 | Apache-2.0 | Rust | 2024-07-30 | Archived. README: ExactSubstr dedup in Rust, via a suffix array, described by the authors as research code. It also releases NearDup clusters for C4, RealNews, LM1B, and a corpus it names Wiki-4B-en. Those released clusters are not imported. The ExactSubstr tool can run later on shard-scale text we already accepted. It does not merge opposing claims. |
| [ChenghaoMou/text-dedup](https://github.com/ChenghaoMou/text-dedup) | 765 | Apache-2.0 | Python | 2026-03-09 | README: MinHash LSH, 64- or 128-bit SimHash, suffix-array substring dedup, and a Bloom filter. Python sidecar. |
| [ekzhu/datasketch](https://github.com/ekzhu/datasketch) | 2,980 | MIT | Python | 2026-10-26 | API description lists MinHash, LSH, LSH Forest, Weighted MinHash, HyperLogLog, HyperLogLog++, LSH Ensemble, and HNSW. |
| [apache/datasketches-rust](https://github.com/apache/datasketches-rust) | 150 | Apache-2.0 | Rust | 2026-11-18 | API description: stochastic streaming sketches. Not a claim clusterer. |
| [conanhujinming/text_dedup](https://github.com/conanhujinming/text_dedup) | 60 | MIT | C++ | 2025-08-25 | API description: “High-Performance Text Deduplication Toolkit.” |

### Graphs and extracts that are not imported as claims

| Repository | Stars | Licence | Pushed | Decision |
| --- | --- | --- | --- | --- |
| [WikiExtractor/wikiextractor](https://github.com/WikiExtractor/wikiextractor) | 4,008 | AGPL-3.0 | 2026-10-19 | API description: “A tool for extracting plain text from Wikipedia dumps.” Rejected. |
| [sgottsch/eventkg](https://github.com/sgottsch/eventkg) | 52 | no SPDX id | 2023-06-14 | API description: event data from Wikidata, DBpedia, YAGO, and the Wikipedia Current Events Portal. Rejected. |
| [commonsense/conceptnet5](https://github.com/commonsense/conceptnet5) | 2,960 | NOASSERTION | 2023-01-19 | GitHub’s language field is Roff (86% of bytes) because the licence text dominates; Python is 12%. `LICENSE.txt` says the code is Apache-2.0 and the data is CC-BY-SA 4.0, and that the two licences are separate. The API still reports NOASSERTION. The data is crowdsourced common sense. It is not a primary, and it is not imported. CC-BY-SA would also be a share-alike obligation on any data that was imported. |
| [Wikidata-Toolkit/Wikidata-Toolkit](https://github.com/Wikidata-Toolkit/Wikidata-Toolkit) | 416 | Apache-2.0 | 2026-11-16 | Repository description: Java library to interact with Wikibase. Identifier crosswalk only. |
| [kensho-technologies/qwikidata](https://github.com/kensho-technologies/qwikidata) | 161 | Apache-2.0 | 2023-10-28 | Repository description: Python tools for interacting with Wikidata. Default branch `develop`. Identifier crosswalk only. |
| [LeMyst/WikibaseIntegrator](https://github.com/LeMyst/WikibaseIntegrator) | 93 | MIT | 2026-11-18 | Repository description: read and write a Wikibase instance through the Wikibase API and the SPARQL endpoint. This pipeline does not write, and it does not import statements. |
| [earwig/mwparserfromhell](https://github.com/earwig/mwparserfromhell) | 909 | MIT | 2026-10-27 | API description: “A Python parser for MediaWiki wikicode.” Use it on a Wikisource transcription of a named primary. The scan or the edition remains the source. |

## Licence compatibility with an MIT application

Depend on these and keep the dependency’s own licence: MIT, Apache-2.0, BSD-3-Clause, Unlicense, CC0-1.0. Apache-2.0’s patent grant stays on that component. MPL-2.0 (`chfoo/warcat-rs`) is usable when modified MPL files remain under MPL.

Do not link or vendor: AGPL-3.0 (`jjjake/internetarchive`, Open Library and its client, `openfactcheck`, `nanodash`, [dvolgyes/zenodo_get](https://github.com/dvolgyes/zenodo_get) at 262 stars, pushed 2026-10-26), GPL-2.0 ([zenodo/zenodo](https://github.com/zenodo/zenodo), 1,047 stars, pushed 2026-03-13), GPL-3.0 (`zenodo-rdm`, `gdeltPyR`, `claimbuster-spotter`, WikiExtractor, PyGallica, `JonasOlson/rust-physical_constants`), EUPL-1.2 (`europeana/api2` and the Europeana Python client). Calling the public HTTP API from MIT code does not copy those programs.

No SPDX id, or `NOASSERTION`, means the code is not copied. That list includes `api.congress.gov`, the National Archives Catalog repository, `allenai/s2orc`, `ncbi/datasets`, `entrez-rs`, AVeriTeC, `claimreview-collector`, `claimreview-data`, concordia, and the ConceptNet repository as GitHub classifies it. Use the public HTTP service where one exists.

Code licence is not permission to store the documents. OpenAlex, Crossref, arXiv full text, PubMed, Chronicling America OCR, Europeana objects, Gallica images, National Archives digital objects, and Archive.org items each have their own terms. Those terms were not opened in this pass. Two exceptions were read far enough to quote: the S2ORC README states ODC-By 1.0 for the corpus, and the biomcp README warns that some upstream biomedical sources restrict commercial or clinical use.

## Open questions

- The NIST ASCII table is the numerical source, and `nist.py` names the URLs. The SI brochure and the CODATA adjustment paper were not opened as files in this pass. GROBID is how their prose gets a page coordinate once those PDFs are fetched by DOI. No BIPM client was found. The Rust hit named BIP is an image format.
- Provider terms listed in the licence section still need a direct read. Until then the pipeline stores the quotation, the locator, and metadata the client already returns, and it does not bulk-store full text.
- `api.congress.gov` and `usnationalarchives/Catalog-API` have no SPDX id. The pipeline calls the APIs and does not copy the documentation repositories or the Congress.gov sample clients.
- Newspaper Navigator is archived, and the README says it is unmaintained. Prefer the Chronicling America page and OCR files. Use the repository as the map of those files.
- GROBID’s citation-context scores are in the .76 to .91 F1 range in its own README, and grobid-quantities is marked work in progress. A core card keeps the PDF coordinate so a wrong span can be seen.
- FActScore’s atomic splitter is a model. GROBID spans remain the writer.
- HORBM’s abstention log is not in this repository. The queue needs a concrete event from that system.
- The 50,000–200,000 band is the owner’s estimate. The first core build should report a real count per slice and stop when the band is reached.
- A Wikidata identifier may be attached to a DOI or an archive id that is already on the card. It does not add a statement.
