# Population survey: Base World Knowledge Pack

Draft survey of public GitHub projects that can fill knowledge.galion.app V2 without writing a new crawler stack. Facts below were read from the GitHub repository API or from a repository README on 18 November 2026. Star counts, licences, languages, and push dates are those API fields. A blank licence means GitHub returned no SPDX id (`null` or `NOASSERTION`). Data licences of the underlying corpora were not read from provider terms in this pass; a code licence is not a data licence.

This file is a survey only. It does not add ingest code, change the running site, or authorise a deploy.

## What a card is

One card is one claim. It carries:

- the claim text, copied or tightly paraphrased from a span that exists in a source
- source locator (URI plus page, paragraph, or byte offset)
- date of the source
- `said_by` (author, body, or newspaper, as named on the source)
- evidence strength
- kind: `fact`, `opinion`, or `contested`
- contested views: other cards that share an event or question and disagree
- pack: `core` or `shard:<id>`

If the span cannot be pointed at, the card is not written. Abstaining is a queue item, not a card.

## Owner constraints applied here

- No Wikipedia prose, and nothing derived from it. [WikiExtractor/wikiextractor](https://github.com/WikiExtractor/wikiextractor) (4,008 stars, AGPL-3.0, Python, pushed 2026-10-19, “A tool for extracting plain text from Wikipedia dumps”) is rejected as a source. DBpedia and YAGO were not adopted. The search `yago knowledge graph` did not return a canonical YAGO dump repository; it did return [sgottsch/eventkg](https://github.com/sgottsch/eventkg) (52 stars, no SPDX licence, Java, pushed 2023-06-14), whose description says it incorporates Wikidata, DBpedia, YAGO, and the Wikipedia Current Events Portal. That mix is rejected as claim text.
- Wikidata is an identifier crosswalk only, never a source of claims. Optional clients, if used that way: [Wikidata-Toolkit/Wikidata-Toolkit](https://github.com/Wikidata-Toolkit/Wikidata-Toolkit) (416 stars, Apache-2.0, Java, pushed 2026-11-16, “Java library to interact with Wikibase”), [kensho-technologies/qwikidata](https://github.com/kensho-technologies/qwikidata) (161 stars, Apache-2.0, Python, pushed 2023-10-28), [LeMyst/WikibaseIntegrator](https://github.com/LeMyst/WikibaseIntegrator) (93 stars, MIT, Python, pushed 2026-11-18).
- Preferred inputs: original documents and scans, peer-reviewed papers and their data, official measurement publications, and more than one national or ideological archive for contested history.
- Wikisource is in scope only as a transcription of a named primary, with the scan or edition kept as the source. [earwig/mwparserfromhell](https://github.com/earwig/mwparserfromhell) (909 stars, MIT, Python, pushed 2026-10-27, “A Python parser for MediaWiki wikicode”) can parse that wikitext. It is not pointed at Wikipedia articles.
- The Base World Knowledge Pack is only the core. The owner’s size band is about 50,000 to 200,000 well-sourced cards. That number is a target, not a yield measured from these tools.
- Deeper subjects (specialist medicine, law per country, niche science) are optional shards.
- When HORBM answers “I don’t know”, that question enters a queue. The queue does not invent a card.

## Pack layout

| Pack | What it holds | What it refuses |
| --- | --- | --- |
| `core` | Physical laws and constants; how Earth and life work at textbook-mechanism depth; main history from original documents, both sides kept; how money, power, and law work as mechanisms; epistemology (how a claim is known); how to talk with people, from research not advice columns | Specialist medicine, a country’s full statute book, niche subfields, web opinion, Wikipedia |
| `shard:<id>` | One deeper subject, same card schema, same span rule | Promotion into `core` just because a paper exists |
| gap queue | Questions HORBM could not answer | A generated answer used as if it were a source |

Core slices, in build order:

1. Constants and physical laws, from measurement-body publications and the papers that report them.
2. Earth and life mechanisms (cell, evolution as documented, climate physics, geology), from papers and raw data, not from encyclopedia prose.
3. Main history, as paired primary documents. Two newspapers or two archives on the same event stay two cards.
4. Money, power, and law as mechanisms (what a statute is, what a central institution publishes), from official texts. Not every jurisdiction.
5. Epistemology: cards that state how evidence was graded, themselves cited to a method document.
6. How to talk with people: a small cap of peer-reviewed communication and linguistics claims, marked `opinion` or `contested` when the paper is not a measurement.

## Survey

### A. Bulk sources and parsers

Scholarly metadata and full text. These feed core slices 1, 2, 4, 5, and 6, and later science shards.

| Repository | Stars | Licence | Language | Pushed | Fit |
| --- | --- | --- | --- | --- | --- |
| [grobidOrg/grobid](https://github.com/grobidOrg/grobid) | 5,234 | Apache-2.0 | Java | 2026-11-18 | “A machine learning software for extracting information from scholarly documents.” Turns a PDF into title, authors, affiliations, citations, and sections. Primary extractor for papers. |
| [grobidOrg/grobid-client-python](https://github.com/grobidOrg/grobid-client-python) | 417 | Apache-2.0 | Python | 2026-11-10 | “Python client for GROBID Web services.” |
| [lfoppiano/grobid-quantities](https://github.com/lfoppiano/grobid-quantities) | 85 | Apache-2.0 | JavaScript (repo language field) | 2026-09-13 | “GROBID extension for identifying and normalizing physical quantities.” Fit for constants and measured values inside papers. |
| [J535D165/pyalex](https://github.com/J535D165/pyalex) | 434 | MIT | Python | 2026-10-05 | “A Python library for OpenAlex.” Topic filters for the core allowlist and for shard boundaries. |
| [ourresearch/openalex-guts](https://github.com/ourresearch/openalex-guts) | 158 | MIT | Python | 2026-03-06 | “The guts for computing data for OpenAlex.” Upstream pipeline, not a card store. |
| [ourresearch/openalex-api-tutorials](https://github.com/ourresearch/openalex-api-tutorials) | 151 | MIT | Jupyter Notebook | 2024-04-25 | Notebooks for the OpenAlex API. |
| [sckott/habanero](https://github.com/sckott/habanero) | 253 | MIT | Python | 2026-10-25 | “Python client for Crossref search API.” DOI metadata, authors, dates, references. |
| [mattsse/crossref-rs](https://github.com/mattsse/crossref-rs) | 21 | Apache-2.0 | Rust | 2024-03-22 | “A rust client for the Crossref-API.” Rust-side DOI client. Last push is 2024; treat as a client to read, not as unmaintained proof it is wrong. |
| [lukasschwab/arxiv.py](https://github.com/lukasschwab/arxiv.py) | 1,567 | MIT | Python | 2026-11-14 | “Python wrapper for the arXiv API.” Preprint discovery. A preprint is not a measurement-body source; evidence strength stays below a reviewed paper. |
| [neoncitylights/arxiv](https://github.com/neoncitylights/arxiv) | 1 | Apache-2.0 | Rust | 2026-02-01 | “A Rust crate to parse arXiv identifiers and references.” Identifier parsing only. |
| [arthiondaena/arxivETL_sync](https://github.com/arthiondaena/arxivETL_sync) | 8 | MIT | Rust | 2026-07-11 | Description: parallel ETL of arXiv LaTeX sources from AWS S3 into Parquet. Full-text shard input, not the core’s first cut. |
| [allenai/s2orc-doc2json](https://github.com/allenai/s2orc-doc2json) | 478 | Apache-2.0 | Python | 2024-04-11 | “Parsers for scientific papers (PDF2JSON, TEX2JSON, JATS2JSON).” |
| [allenai/s2orc](https://github.com/allenai/s2orc) | 1,094 | none | Python | 2024-04-26 | “S2ORC: The Semantic Scholar Open Research Corpus.” Paper corpus. No SPDX licence on the repo; do not copy code until terms are read. |
| [danielnsilva/semanticscholar](https://github.com/danielnsilva/semanticscholar) | 485 | MIT | Python | 2026-08-01 | “Unofficial Python client library for Semantic Scholar APIs.” |
| [ncbi/datasets](https://github.com/ncbi/datasets) | 566 | none | Jupyter Notebook | 2026-11-13 | “NCBI Datasets is a new resource that lets you easily gather data from across NCBI databases.” Raw data for the life slice and the medicine shard. No SPDX id. |
| [genomoncology/biomcp](https://github.com/genomoncology/biomcp) | 683 | MIT | Rust | 2026-11-10 | “BioMCP: Biomedical Model Context Protocol.” Topics include PubMed and PubMed Central. Medicine shard client, not core. |
| [Zenleaf/entrez-rs](https://github.com/Zenleaf/entrez-rs) | 20 | none | Rust | 2022-12-08 | “A Rust wrapper around the Entrez API” including PubMed. No SPDX id, last push 2022. |
| [revidiumhq/biblib](https://github.com/revidiumhq/biblib) | 10 | Apache-2.0 | Rust | 2026-10-11 | “Parse, manage, and deduplicate academic citations.” Topics include DOI, PubMed, RIS. |
| [hongkongkiwi/research-master](https://github.com/hongkongkiwi/research-master) | 4 | MIT | Rust | 2026-11-12 | “MCP to help search academic research papers.” Topics list arXiv, DOI, OpenAlex, PubMed, Semantic Scholar. Small; useful as a map of endpoints, not as the backbone. |
| [TIBHannover/orkg-backend](https://github.com/TIBHannover/orkg-backend) | 6 | MIT | Kotlin | 2026-11-12 | Read-only mirror of the Open Research Knowledge Graph backend (GitLab is the upstream named in the description). Paper-comparison graph for science shards. |
| [TIBHannover/orkg-nlp-pypi](https://github.com/TIBHannover/orkg-nlp-pypi) | 4 | MIT | Python | 2023-06-30 | Read-only mirror of ORKG NLP package. |
| [sciknoworg/llm-atlas](https://github.com/sciknoworg/llm-atlas) | 3 | MIT | Python | 2026-10-21 | Description: structured extraction from papers into ORKG. Example of a shard loader, not a core source. |
| [zenodo/zenodo-rdm](https://github.com/zenodo/zenodo-rdm) | 358 | GPL-3.0 | Python | 2026-11-17 | “Zenodo, powered by InvenioRDM.” Data-repository records as evidence attachments. GPL: call the public API, do not link the server code into an MIT app. |
| [cthoyt/zenodo-client](https://github.com/cthoyt/zenodo-client) | 47 | MIT | Python | 2026-04-13 | “A tool for automated uploading and version management of scientific data to Zenodo.” Upload-oriented; useful as an API example. |

Archives and official texts. These feed history and the law/power slice.

| Repository | Stars | Licence | Language | Pushed | Fit |
| --- | --- | --- | --- | --- | --- |
| [LibraryOfCongress/api.congress.gov](https://github.com/LibraryOfCongress/api.congress.gov) | 1,015 | none | Java | 2026-11-16 | “congress.gov API.” Primary US bill and law text for the “how law works” slice. No SPDX id on the repo. |
| [LibraryOfCongress/data-exploration](https://github.com/LibraryOfCongress/data-exploration) | 236 | CC0-1.0 | Jupyter Notebook | 2026-04-23 | “Tutorials for working with Library of Congress collections data.” Patterns for collection APIs. CC0 code. |
| [LibraryOfCongress/newspaper-navigator](https://github.com/LibraryOfCongress/newspaper-navigator) | 272 | Unlicense | Jupyter Notebook | 2025-07-07 | README: extracts visual content and METS/ALTO OCR from 16,368,041 Chronicling America newspaper pages. Archived. README says no active maintenance. Fit: both-sides history as printed pages, with the page image kept as the source. OCR is a transcription, not a neutral summary. |
| [LibraryOfCongress/concordia](https://github.com/LibraryOfCongress/concordia) | 175 | none | Python | 2026-11-18 | “Crowdsourcing platform for full text transcription and tagging” at crowd.loc.gov. Transcription workflow, not a claim graph. |
| [europeana/api2](https://github.com/europeana/api2) | 30 | EUPL-1.2 | Java | 2026-11-17 | “Europeana's Search and Record API.” Cultural-heritage objects across European institutions. EUPL code stays out of the MIT binary; use HTTP. |
| [europeana/rd-europeana-python-api](https://github.com/europeana/rd-europeana-python-api) | 9 | EUPL-1.2 | Python | 2023-11-08 | “Python API for Europeana.” Same licence caution. |
| [jjjake/internetarchive](https://github.com/jjjake/internetarchive) | 1,933 | AGPL-3.0 | Python | 2026-11-17 | “A Python and Command-Line Interface to Archive.org.” Scans and publications. AGPL: do not vendor; call Archive.org over HTTP from MIT code. |
| [internetarchive/openlibrary](https://github.com/internetarchive/openlibrary) | 6,930 | AGPL-3.0 | Python | 2026-11-18 | “One webpage for every book ever published!” Catalogue and bibliographic records. Book text is still under each book’s own rights. AGPL app code is not linked in. |
| [internetarchive/openlibrary-client](https://github.com/internetarchive/openlibrary-client) | 511 | AGPL-3.0 | Python | 2026-10-08 | “Python Client Library for the Archive.org OpenLibrary API.” |
| [jedireza/warc](https://github.com/jedireza/warc) | 61 | MIT | Rust | 2024-11-27 | “A Rust library for reading and writing WARC files.” |
| [maxcountryman/warc-parquet](https://github.com/maxcountryman/warc-parquet) | 117 | MIT | Rust | 2025-02-12 | “A simple CLI for converting WARC to Parquet.” |
| [chatnoir-eu/chatnoir-resiliparse](https://github.com/chatnoir-eu/chatnoir-resiliparse) | 154 | Apache-2.0 | Rust | 2026-11-04 | “A robust web archive analytics toolkit.” WARC and content extraction. Use on archive files already chosen as primaries, not on an open web crawl. |
| [chfoo/warcat-rs](https://github.com/chfoo/warcat-rs) | 34 | MPL-2.0 | Rust | 2025-06-02 | “Command-line tool and Rust library for handling Web ARChive (WARC) files.” MPL is file-level copyleft. |

A GitHub search for `CODATA OR NIST constants language:Rust` did not return a physical-constants parser. The top hits were unrelated Rust crates about compile-time or constant-time code. No BIPM, CODATA, or NIST dump client was verified. Core constants should be read from the official publications (PDF or table) via GROBID quantities, not from an unverified scraper.

Common Crawl and general web crawlers are not core sources. [internetarchive/brozzler](https://github.com/internetarchive/brozzler) (824 stars, Apache-2.0, Python, pushed 2026-11-18, “distributed browser-based web crawler”) is a crawler, not a claim store. Web pages are not admitted unless the URL is itself an official document or a scanned primary.

### B. Claim extraction and atomic splitting

| Repository | Stars | Licence | Language | Pushed | Fit |
| --- | --- | --- | --- | --- | --- |
| [shmsw25/FActScore](https://github.com/shmsw25/FActScore) | 464 | MIT | Python | 2025-04-13 | README: official EMNLP 2023 package for fine-grained atomic facts. Default knowledge source is “Wikipedia dump from 2023/04/01”. That default is rejected. The same README documents `register_knowledge_source` for a custom JSONL of `title` and `text`, and an ACL Anthology preprocessing example. Usable only against a primary-source database. README also describes abstain detection; an abstention is a gap-queue event, not a card. |
| [utaresearch/claimbuster-spotter](https://github.com/utaresearch/claimbuster-spotter) | 87 | GPL-3.0 | Python | 2023-11-29 | “Adversarial Training on Transformer Networks to discover check-worthy factual claims.” Ranks sentences that are worth checking. GPL: do not link. The idea (score check-worthiness, then require a span) fits the core filter. |
| [grobidOrg/grobid](https://github.com/grobidOrg/grobid) | 5,234 | Apache-2.0 | Java | 2026-11-18 | Preferred splitter for the core: a sentence in a paper that already cites a source, not an LLM decomposition. |

LLM atomic splitters can invent boundaries. For the core, a card is a GROBID sentence or a quantity span that quotes the primary. FActScore’s generator is a later checker, not the writer.

### C. Fact verification and source checking

| Repository | Stars | Licence | Language | Pushed | Fit |
| --- | --- | --- | --- | --- | --- |
| [awslabs/fever](https://github.com/awslabs/fever) | 130 | Apache-2.0 | HTML | 2026-02-20 | “FEVER (Fact Extraction and VERification) Annotation Platform and Baselines.” Wikipedia-based benchmark. Not a knowledge source. The label pattern (claim, evidence span, support or refute) is the pattern to keep, with the span required to be a primary. |
| [sheffieldnlp/naacl2018-fever](https://github.com/sheffieldnlp/naacl2018-fever) | 129 | Apache-2.0 | Python | 2023-02-03 | “Fact Extraction and VERification baseline.” Archived. Same rejection as a source. |
| [MichSchli/AVeriTeC](https://github.com/MichSchli/AVeriTeC) | 84 | none | Python | 2024-11-27 | AVeriTeC repository. No description and no SPDX licence. Not adopted as a claim corpus until the evidence documents are shown to be primaries. |
| [ssu-humane/HerO](https://github.com/ssu-humane/HerO) | 15 | none | Python | 2025-03-18 | “fact-checking pipeline based on open LLMs (the runner-up in AVeriTeC).” No SPDX licence. Reference only. |
| [openfactcheck-research/openfactcheck](https://github.com/openfactcheck-research/openfactcheck) | 32 | AGPL-3.0 | Python | 2026-08-15 | “An Open-source Factuality Evaluation Demo for LLMs.” AGPL. Do not link. |
| [yuxiaw/OpenFactCheck](https://github.com/yuxiaw/OpenFactCheck) | 65 | none | Python | 2024-06-07 | Earlier OpenFactCheck tree. No SPDX licence. |
| [MartinoMensio/claimreview-collector](https://github.com/MartinoMensio/claimreview-collector) | 3 | none | Jupyter Notebook | 2026-11-16 | Collector for ClaimReview datasets. |
| [MartinoMensio/claimreview-data](https://github.com/MartinoMensio/claimreview-data) | 7 | none | none | 2026-11-18 | ClaimReview data repo. No SPDX licence. |

ClaimReview records are not facts. They are `contested` annotations whose `said_by` is the fact-checker. [admataz/wp-factchecker-claim-review](https://github.com/admataz/wp-factchecker-claim-review) (10 stars, no SPDX licence, PHP, pushed 2017-08-24) is a WordPress plugin “for adding Schema.org ClaimReview metadata”. It documents the schema shape. It is not a source of truth.

### D. Provenance and citation formats

| Repository | Stars | Licence | Language | Pushed | Fit |
| --- | --- | --- | --- | --- | --- |
| [Nanopublication/nanopub-rs](https://github.com/Nanopublication/nanopub-rs) | 25 | MIT | Rust | 2026-10-29 | “A cross-platform Rust library to sign, publish, and check Nanopublications.” Assertion plus provenance plus publication info. Matches one claim, one source, one author. MIT, Rust. |
| [Nanopublication/nanopub-py](https://github.com/Nanopublication/nanopub-py) | 38 | Apache-2.0 | Python | 2026-11-17 | “Python client for searching, publishing and modifying nanopublications.” |
| [Nanopublication/nanopub-java](https://github.com/Nanopublication/nanopub-java) | 33 | MIT | Java | 2026-11-18 | “Java library for nanopublications based on RDF4J.” |
| [knowledgepixels/nanodash](https://github.com/knowledgepixels/nanodash) | 43 | AGPL-3.0 | Java | 2026-11-18 | “A web client to browse and publish nanopublications.” AGPL UI. Do not embed. |
| [CLARIAH/COW](https://github.com/CLARIAH/COW) | 48 | MIT | Python | 2024-05-06 | “Integrated CSV to RDF converter, using CSVW and nanopublications.” Batch path from a card table to RDF. |
| [revidiumhq/biblib](https://github.com/revidiumhq/biblib) | 10 | Apache-2.0 | Rust | 2026-10-11 | Citation parse and dedup (DOI, PubMed, RIS). |

No W3C PROV library was opened in this pass. Nanopublications already split assertion from provenance; that is the format to write first. PROV-O can be an export later if a maintained library is verified.

### E. Dedup and clustering

Dedup keys, in order: DOI, PMID, arXiv id, Library of Congress item id, Archive.org identifier, congress.gov id, then normalised claim text. Near-duplicates collapse only when `said_by` and source are the same. Two opposing sentences about one event share an event id and stay two cards.

| Repository | Stars | Licence | Language | Pushed | Fit |
| --- | --- | --- | --- | --- | --- |
| [serega/gaoya](https://github.com/serega/gaoya) | 83 | MIT | Rust | 2026-11-14 | “Locality Sensitive Hashing.” Topics: minhash, simhash, LSH. Rust, MIT, recently pushed. First choice inside the MIT app. |
| [hirosassa/doubri-rs](https://github.com/hirosassa/doubri-rs) | 4 | MIT | Rust | 2026-11-03 | “large-scale document deduplication toolkit using MinHash and Locality-Sensitive Hashing (LSH).” Small, MIT, current. |
| [dipeshbabu/pari](https://github.com/dipeshbabu/pari) | 7 | MIT | Rust | 2026-11-18 | “Similarity indexing and deduplication for large datasets, with Rust, Python, and CLI interfaces.” |
| [google-research/deduplicate-text-datasets](https://github.com/google-research/deduplicate-text-datasets) | 1,274 | Apache-2.0 | Rust | 2024-07-30 | Exact-substring dedup at dataset scale. Archived. Apache-2.0. Use for shard-scale text, not for merging opposing claims. |
| [ChenghaoMou/text-dedup](https://github.com/ChenghaoMou/text-dedup) | 765 | Apache-2.0 | Python | 2026-03-09 | “All-in-one text de-duplication.” MinHash/LSH style text dedup. Python sidecar. |
| [ekzhu/datasketch](https://github.com/ekzhu/datasketch) | 2,980 | MIT | Python | 2026-10-26 | “MinHash, LSH, LSH Forest, Weighted MinHash, HyperLogLog, HyperLogLog++, LSH Ensemble and HNSW.” |
| [apache/datasketches-rust](https://github.com/apache/datasketches-rust) | 150 | Apache-2.0 | Rust | 2026-11-18 | “A software library of stochastic streaming algorithms, a.k.a. sketches.” Cardinality and similarity sketches, not a ready-made claim clusterer. |
| [conanhujinming/text_dedup](https://github.com/conanhujinming/text_dedup) | 60 | MIT | C++ | 2025-08-25 | “High-Performance Text Deduplication Toolkit.” |

### F. Contested and multi-perspective sources

There is no verified open clone of an AllSides-style bias catalogue in the searches that ran. Perspective is kept by retaining two primaries, not by importing a bias label as truth.

| Repository | Stars | Licence | Language | Pushed | Fit |
| --- | --- | --- | --- | --- | --- |
| [LibraryOfCongress/newspaper-navigator](https://github.com/LibraryOfCongress/newspaper-navigator) | 272 | Unlicense | Jupyter Notebook | 2025-07-07 | Many US newspapers, page-level, both editorial lines kept as separate cards. README cites Chronicling America and the National Digital Newspaper Program. |
| [europeana/api2](https://github.com/europeana/api2) | 30 | EUPL-1.2 | Java | 2026-11-17 | Objects and records from many European holding institutions. A second national memory beside the Library of Congress. |
| [alex9smith/gdelt-doc-api](https://github.com/alex9smith/gdelt-doc-api) | 234 | MIT | Python | 2025-04-22 | “A Python client for the GDELT 2.0 Doc API.” GDELT is a news index. It may point at article URLs. The card source is the article or the archive scan, not the GDELT row. |
| [linwoodc3/gdeltPyR](https://github.com/linwoodc3/gdeltPyR) | 260 | GPL-3.0 | Jupyter Notebook | 2023-11-30 | GDELT 1.0 and 2.0 client. GPL. Event codes are not claims. |
| [MartinoMensio/claimreview-collector](https://github.com/MartinoMensio/claimreview-collector) | 3 | none | Jupyter Notebook | 2026-11-16 | External fact-checker ratings, stored as contested views. |

A history card is contested when two primaries, or a primary and a ClaimReview, disagree. The pipeline stores both. It does not average them.

### G. Existing graphs to import

| Repository | Stars | Licence | Language | Pushed | Decision |
| --- | --- | --- | --- | --- | --- |
| [TIBHannover/orkg-backend](https://github.com/TIBHannover/orkg-backend) | 6 | MIT | Kotlin | 2026-11-12 | Import comparisons only as shards, and only when each cell still cites a paper. |
| [allenai/s2orc](https://github.com/allenai/s2orc) | 1,094 | none | Python | 2024-04-26 | Paper corpus for shards after data terms are read. Not a card graph. |
| [commonsense/conceptnet5](https://github.com/commonsense/conceptnet5) | 2,960 | none | Roff | 2023-01-19 | “Code for building ConceptNet from raw data.” Crowdsourced common sense. Not a primary. Do not import as claims. |
| [sgottsch/eventkg](https://github.com/sgottsch/eventkg) | 52 | none | Java | 2023-06-14 | Mixes Wikidata, DBpedia, YAGO, and Wikipedia current events. Rejected. |
| [WikiExtractor/wikiextractor](https://github.com/WikiExtractor/wikiextractor) | 4,008 | AGPL-3.0 | Python | 2026-10-19 | Rejected. |
| Wikidata clients above | — | Apache-2.0 or MIT | Java or Python | 2023–2026 | Identifier crosswalk only. |

## Recommended pipeline

Rust where a maintained crate exists. Python and Java stay sidecars. AGPL, GPL, and EUPL code is not linked into the MIT application; those systems are used over HTTP if at all.

### 1. Core first

Allowlist, not a crawl.

1. **Constants and laws.** Locate the CODATA adjustment paper, the SI brochure, and similar measurement-body PDFs by DOI (`crossref-rs` or `habanero`). Run GROBID and `grobid-quantities`. One normalised quantity plus its uncertainty is one card. `said_by` is the body named on the paper (CODATA, NIST, BIPM) as printed, not a Wikipedia page. Evidence strength is `measurement`. No verified parser for the official tables was found; the PDF path is the one that uses existing tools.
2. **Earth and life, mechanisms only.** `pyalex` with a short topic allowlist (for example cell, photosynthesis, plate tectonics, orbital mechanics). Drop specialist medicine topics into the medicine shard list instead of downloading them. For each work, Crossref supplies authors and date. GROBID supplies sentences that already contain a citation. The card quotes that sentence and points at the DOI and the citation span. Open access status decides whether the full text may be stored; metadata can be stored when the text cannot.
3. **Main history, both sides.** Library of Congress collection API (patterns in `data-exploration`) and Chronicling America pages via the Newspaper Navigator method or the Chronicling America files it reads. Europeana HTTP API for a second institutional memory. Archive.org HTTP API for scans. A card’s source is the page image plus OCR or transcription. The same date and place from two newspapers produces two cards linked by an event id. GDELT may suggest URLs; it does not become the claim.
4. **Money, power, law as mechanisms.** `api.congress.gov` for what a bill and a statute look like, quoted from the official text. A handful of constitutional or charter documents from archives, same span rule. Country-by-country codes are not downloaded in this step.
5. **Epistemology.** A small set of cards whose text is the grading rule itself (“a CODATA value outranks a preprint”), each cited to the method document used in steps 1–4. These cards are how HORBM explains why it trusts a source.
6. **How to talk with people.** `pyalex` topic filter for peer-reviewed communication and linguistics, hard cap, same GROBID span rule. Default kind is `opinion` or `contested` unless the paper reports a measurement. No advice blogs.

Write each accepted card with `nanopub-rs`: assertion (the claim), provenance (source URI, span, date, `said_by`, evidence strength, kind), publication info (pack `core`, pipeline version). `CLARIAH/COW` can batch the same table to RDF if a CSV stage is easier to audit.

Dedup inside the core with exact identifiers first, then `gaoya` MinHash. Do not merge cards that differ in `said_by`.

Stop at the owner’s band (about 50,000–200,000 cards). If a slice overruns, narrow the allowlist. Do not fill the band with shard material.

### 2. Shards second

Same writer, `pack=shard:<id>`. Suggested first shards, in the order the core will feel thin:

| Shard | Existing pieces | Notes |
| --- | --- | --- |
| `shard:medicine` | `biomcp` or Entrez HTTP, GROBID, `ncbi/datasets` | Specialist medicine stays here. `entrez-rs` has no SPDX licence. |
| `shard:law-<country>` | That country’s official gazette or legislature API, found per country | Not started from congress.gov alone. |
| `shard:science-<topic>` | `pyalex` topic query, Crossref, GROBID, optional ORKG comparison | ORKG cells only with a paper citation. |
| `shard:data` | Zenodo HTTP API, NCBI Datasets | Datasets support a claim; they are not prose claims. Zenodo’s server is GPL-3.0. |
| `shard:preprints` | `arxiv.py`, `arxivETL_sync` | Lower evidence strength than a reviewed paper. |

`s2orc-doc2json` is the fallback parser when GROBID misses a PDF or a TeX source. S2ORC bulk text waits on a reading of its data terms; the GitHub repo has no SPDX licence.

### 3. Gap queue third

HORBM already abstains with “I don’t know”. That string is the intake.

1. Log `{question, asked_at, guessed_pack}` in a queue. This is not a card.
2. A worker searches only the allowlist for the guessed pack: OpenAlex and Crossref for science and epistemology, congress.gov for US law mechanism, Chronicling America and Europeana and Archive.org for history.
3. A hit with a span becomes a card in `core` if the slice is one of the six core slices and the core is still inside the size band. Otherwise it becomes a shard card.
4. A miss stays “I don’t know”. The queue item remains, with a higher priority if the question repeats. Nothing is generated to close it.
5. FActScore, if run, uses `register_knowledge_source` on the primary-span database only. Its README abstain path maps to step 4. The default Wikipedia database is not downloaded.

The queue is the only way new core cards appear after the first build, and only when a primary span exists.

## Licence compatibility with an MIT application

Compatible to depend on, with the dependency’s own licence kept: MIT, Apache-2.0, BSD-3-Clause, Unlicense, CC0-1.0. Apache-2.0 adds a patent grant on that component. MPL-2.0 (`warcat-rs`) is usable if modified MPL files stay under MPL.

Not linked or vendored: AGPL-3.0 (`jjjake/internetarchive`, Open Library, `openfactcheck`, `nanodash`, `zenodo_get`), GPL-2.0/GPL-3.0 (`zenodo/zenodo`, `zenodo-rdm`, `gdeltPyR`, `claimbuster-spotter`, WikiExtractor), EUPL-1.2 (`europeana/api2` and the Europeana Python client). Calling a public HTTP API from MIT code does not copy those programs.

No SPDX id, or `NOASSERTION`: do not copy the code. That includes `api.congress.gov`, `allenai/s2orc`, `ncbi/datasets`, `entrez-rs`, `MichSchli/AVeriTeC`, `claimreview-collector`, and ConceptNet. Use the public HTTP service where one exists, or rewrite a thin client.

Code licence is not permission to store the documents. OpenAlex, Crossref, arXiv full text, PubMed, S2ORC, Chronicling America OCR, Europeana objects, and Archive.org items each have their own terms. Those terms were not opened in this pass.

## Open questions

- Official CODATA, NIST, and BIPM tables: no parser repository was verified. Confirm the file the measurement bodies actually publish (PDF, CSV, or both) before writing an ingester.
- Data licences listed above still need a direct read. Until then, store metadata and quotations the provider already marks reusable, and keep a pointer when the full text is not.
- `api.congress.gov` has no SPDX licence. Confirm whether the API documentation may be copied or only called.
- Newspaper Navigator is archived and the README says it is unmaintained. Prefer Chronicling America files directly, using that repo as the documented pipeline, not as a service.
- National archives outside the Library of Congress and Europeana (Gallica, UK National Archives, and others) were not verified as GitHub clients in this pass. The history slice is US newspapers plus Europeana until those clients are opened.
- HORBM’s abstention log is not in this repository. The queue needs a concrete event from that system.
- The 50,000–200,000 band is the owner’s estimate. The first core build should report a real count per slice and stop when the band is reached.
- FActScore’s atomic generator is a model. It can split badly. GROBID spans remain the writer for the core.
- Wikidata crosswalks can attach a DOI or an archive id. They must not add a statement that is not in the primary span.
