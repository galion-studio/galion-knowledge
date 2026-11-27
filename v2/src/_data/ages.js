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

module.exports = {
  stages: stages.map((stage) => {
    const groups = [...stage.groups.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([slug, items]) => ({
        slug,
        count: items.length,
        cards: items.sort((a, b) => a.title.localeCompare(b.title, "en")),
      }));
    const count = groups.reduce((sum, group) => sum + group.count, 0);
    return {
      id: stage.id,
      label: stage.label,
      count,
      shardCount: stage.shardCount,
      groups,
    };
  }),
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
