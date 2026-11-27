const cards = require("./cards");
const catalog = require("./catalog");
const shardPack = require("./shardPack");

// Stage wording is the foundations-first sentence in v2/src/principles.njk.
// The phrases are copied from that sentence, in that order. This file adds no stage.
const STAGES = [
  { id: "body-senses", label: "body and senses" },
  { id: "objects", label: "objects and what they are made of" },
  { id: "cause", label: "cause and effect and basic physics (gravity, support, containment, push and pull)" },
  { id: "people", label: "people, faces and feelings" },
  { id: "social", label: "turn-taking and social cues" },
  { id: "words", label: "first words and naming" },
  { id: "needs", label: "basic needs (food, sleep, safety)" },
  {
    id: "preschool",
    label:
      "the preschool layer (colours, shapes, counting, time and routine, space and direction, animals, plants, weather, home, family)",
  },
  {
    id: "early-school",
    label:
      "the early-school layer (reading, arithmetic, seasons, maps, materials, health and hygiene, community)",
  },
  { id: "adult", label: "the broader adult domains" },
];

function wordsOf(label) {
  return new Set(label.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

const stages = STAGES.map((stage) => ({
  ...stage,
  words: wordsOf(stage.label),
  groups: new Map(),
  shardCount: 0,
}));

function placeSlug(slug) {
  const parts = String(slug || "")
    .toLowerCase()
    .split("-")
    .filter(Boolean);
  if (!parts.length) return null;
  const hits = stages.filter((stage) => parts.every((part) => stage.words.has(part)));
  return hits.length === 1 ? hits[0] : null;
}

function slugsFor(card) {
  const tags = (card.tags || [])
    .filter((tag) => typeof tag === "string" && tag.startsWith("area:foundations-"))
    .map((tag) => tag.slice("area:foundations-".length))
    .filter(Boolean);
  if (tags.length) return [...new Set(tags)];
  if (typeof card.id === "string" && card.id.startsWith("world-f1-")) {
    const token = card.id.slice("world-f1-".length).split("-")[0];
    return token ? [token] : [];
  }
  return [];
}

const categoryName = new Map(
  (catalog.categories || []).map((category) => [category.id, category.name])
);

function brief(card, slug) {
  return {
    id: card.id,
    title: card.title,
    category: card.category,
    categoryName: categoryName.get(card.category) || card.category,
    slug,
  };
}

const unplaced = [];
let shardFoundations = 0;

function take(card, where) {
  if (!card || card._placeholder) return;
  const slugs = slugsFor(card);
  if (!slugs.length) return;
  if (where === "shard") shardFoundations += 1;
  const placed = slugs.map((slug) => ({ slug, stage: placeSlug(slug) }));
  const stageIds = new Set(placed.filter((row) => row.stage).map((row) => row.stage.id));
  if (placed.some((row) => !row.stage) || stageIds.size !== 1) {
    if (where === "core") {
      unplaced.push({
        id: card.id,
        title: card.title,
        slugs,
      });
    }
    return;
  }
  const stage = placed[0].stage;
  if (where === "shard") {
    stage.shardCount += 1;
    return;
  }
  const slug = placed[0].slug;
  if (!stage.groups.has(slug)) stage.groups.set(slug, []);
  stage.groups.get(slug).push(brief(card, slug));
}

for (const card of cards) take(card, "core");
for (const card of shardPack.cards) take(card, "shard");

const packCount = cards.filter((card) => card && !card._placeholder).length;
const core = shardPack.manifest.core_pack;

// Human ages are a rough estimate from CDC milestone pages opened on 27 November 2026.
// A stage with no matching line on those pages stays "I don't know."
const YEARS_UNKNOWN = "I don't know.";
const HUMAN_AGE = {
  "body-senses": {
    years: "by about 2 months (rough estimate)",
    spanMonths: [2, 2],
    yearsNote:
      "CDC says most children (75% or more) look at a face, react to a loud sound, and watch a person move by 2 months. The checklist is not a screening tool.",
    sources: [
      {
        title: "Milestones by 2 months",
        url: "https://www.cdc.gov/act-early/milestones/2-months.html",
        said: "CDC",
        accessed: "2026-11-27",
      },
    ],
  },
  objects: { years: YEARS_UNKNOWN, yearsNote: "", sources: [] },
  cause: {
    years: "about 9 months to 1 year (rough estimate)",
    spanMonths: [9, 12],
    yearsNote:
      "CDC says most children look for an object dropped out of sight by 9 months, and look for a thing they saw hidden by 1 year. Those lines are object search. The same pages do not date gravity, support, containment, or push and pull.",
    sources: [
      {
        title: "Milestones by 9 months",
        url: "https://www.cdc.gov/act-early/milestones/9-months.html",
        said: "CDC",
        accessed: "2026-11-27",
      },
      {
        title: "Milestones by 1 year",
        url: "https://www.cdc.gov/act-early/milestones/1-year.html",
        said: "CDC",
        accessed: "2026-11-27",
      },
    ],
  },
  people: {
    years: "by about 9 months (rough estimate)",
    spanMonths: [9, 9],
    yearsNote:
      "CDC says most children show several facial expressions, such as happy, sad, angry, and surprised, by 9 months.",
    sources: [
      {
        title: "Milestones by 9 months",
        url: "https://www.cdc.gov/act-early/milestones/9-months.html",
        said: "CDC",
        accessed: "2026-11-27",
      },
    ],
  },
  social: { years: YEARS_UNKNOWN, yearsNote: "", sources: [] },
  words: {
    years: "about 1 year to 18 months (rough estimate)",
    spanMonths: [12, 18],
    yearsNote:
      "CDC says most children call a parent mama or dada, or another special name, by 1 year, and try to say three or more words besides mama or dada by 18 months.",
    sources: [
      {
        title: "Milestones by 1 year",
        url: "https://www.cdc.gov/act-early/milestones/1-year.html",
        said: "CDC",
        accessed: "2026-11-27",
      },
      {
        title: "Milestones by 18 months",
        url: "https://www.cdc.gov/act-early/milestones/18-months.html",
        said: "CDC",
        accessed: "2026-11-27",
      },
    ],
  },
  needs: { years: YEARS_UNKNOWN, yearsNote: "", sources: [] },
  preschool: {
    years: "about 4 to 5 years (rough estimate)",
    spanMonths: [48, 60],
    yearsNote:
      "CDC says most children name a few colors by 4 years, and by 5 years count to 10 and use words about time such as yesterday, tomorrow, morning, or night. Those pages do not date shapes, space, direction, animals, plants, weather, home, or family.",
    sources: [
      {
        title: "Milestones by 4 years",
        url: "https://www.cdc.gov/act-early/milestones/4-years.html",
        said: "CDC",
        accessed: "2026-11-27",
      },
      {
        title: "Milestones by 5 years",
        url: "https://www.cdc.gov/act-early/milestones/5-years.html",
        said: "CDC",
        accessed: "2026-11-27",
      },
    ],
  },
  "early-school": { years: YEARS_UNKNOWN, yearsNote: "", sources: [] },
  adult: { years: YEARS_UNKNOWN, yearsNote: "", sources: [] },
};

// The far end of the picture only. Not a measured adult age.
const PICTURE_ADULT_MONTHS = 18 * 12;

function headlineFrom(years) {
  if (!years || years === YEARS_UNKNOWN) return "HORBM is still a newborn. We don't know yet.";
  const phrase = years.replace(/\s*\(rough estimate\)\s*$/, "");
  return `HORBM is ${phrase} old in human years`;
}

function markPercent(spanMonths) {
  if (!Array.isArray(spanMonths) || spanMonths.length !== 2) return null;
  const mid = (Number(spanMonths[0]) + Number(spanMonths[1])) / 2;
  const raw = (mid / PICTURE_ADULT_MONTHS) * 100;
  return Math.round(Math.min(96, Math.max(3, raw)) * 10) / 10;
}

function brainAgeFrom(stageRows) {
  const rows = stageRows || [];
  const held = (stage) => (stage.count || 0) + (stage.shardCount || 0);
  let reached = -1;
  let filledCount = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const filled = held(rows[index]) >= 1;
    if (filled) filledCount += 1;
    if (reached === index - 1 && filled) reached = index;
  }
  const row = reached >= 0 ? rows[reached] : null;
  const years = row && row.years ? row.years : YEARS_UNKNOWN;
  const known = years !== YEARS_UNKNOWN && Array.isArray(row.spanMonths);
  return {
    stageCount: rows.length,
    filledCount,
    reachedIndex: reached,
    reachedLabel: row ? row.label : "",
    cardsHeld: rows.reduce((sum, stage) => sum + held(stage), 0),
    years,
    headline: headlineFrom(years),
    markPercent: known ? markPercent(row.spanMonths) : 3,
  };
}

const publishedStages = stages.map((stage) => {
    const groups = [...stage.groups.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([slug, items]) => ({
        slug,
        count: items.length,
        cards: items.sort((a, b) => a.title.localeCompare(b.title, "en")),
      }));
    const count = groups.reduce((sum, group) => sum + group.count, 0);
    const age = HUMAN_AGE[stage.id] || { years: YEARS_UNKNOWN, yearsNote: "", sources: [] };
    return {
      id: stage.id,
      label: stage.label,
      count,
      shardCount: stage.shardCount,
      groups,
      years: age.years,
      yearsNote: age.yearsNote,
      sources: age.sources,
      spanMonths: age.spanMonths || null,
    };
  });

module.exports = {
  brainAgeFrom,
  headlineFrom,
  markPercent,
  stages: publishedStages,
  brain: brainAgeFrom(publishedStages),
  unplaced: unplaced.sort((a, b) => a.title.localeCompare(b.title, "en")),
  packCount,
  shardFoundations,
  manifest: {
    schema: shardPack.manifest.schema,
    version: shardPack.manifest.version,
    cardCount: core.card_count,
    bytes: core.bytes,
    sha256: core.sha256,
    payload: core.payload,
    shardCount: shardPack.manifest.shards.length,
    shardCardCount: shardPack.manifest.shards.reduce(
      (sum, row) => sum + (row.card_count || 0),
      0
    ),
  },
};
