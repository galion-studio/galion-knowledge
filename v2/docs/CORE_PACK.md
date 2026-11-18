# Core pack notes

Sections below are added by the agents who filled the pack. Each section counts only the cards that agent added.

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
