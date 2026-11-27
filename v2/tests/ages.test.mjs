import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const ages = require(path.join(root, "src/_data/ages.js"));

function principlesLabels() {
  const text = fs.readFileSync(path.join(root, "src/principles.njk"), "utf8");
  const match = text.match(
    /From now on, new cards follow the order a child learns the world in: (.+?)<\/p>/
  );
  assert.ok(match, "foundations-first sentence is in principles.njk");
  return match[1]
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .split("; ")
    .map((part) => part.replace(/^then /, ""));
}

function wordsOf(label) {
  return new Set(label.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

function placeSlug(slug, stages) {
  const parts = slug.toLowerCase().split("-").filter(Boolean);
  const hits = stages.filter((stage) => parts.every((part) => stage.words.has(part)));
  return hits.length === 1 ? hits[0].label : null;
}

test("stage labels are the foundations-first sentence, in order", () => {
  const labels = principlesLabels();
  assert.deepEqual(
    ages.stages.map((stage) => stage.label),
    labels
  );
  assert.equal(new Set(ages.stages.map((stage) => stage.id)).size, labels.length);
});

test("every foundations card is counted once, and only on a stage its slug fits", () => {
  const stages = ages.stages.map((stage) => ({ ...stage, words: wordsOf(stage.label) }));
  const seen = new Set();
  let counted = 0;
  for (const stage of ages.stages) {
    assert.equal(
      stage.count,
      stage.groups.reduce((sum, group) => sum + group.cards.length, 0)
    );
    for (const group of stage.groups) {
      assert.equal(group.count, group.cards.length);
      assert.equal(placeSlug(group.slug, stages), stage.label);
      for (const card of group.cards) {
        assert.equal(seen.has(card.id), false);
        seen.add(card.id);
        counted += 1;
        const file = ["world", "horbm", "diary"]
          .map((section) => path.join(root, "data/cards", section, `${card.id}.json`))
          .find((candidate) => fs.existsSync(candidate));
        assert.ok(file, card.id);
        const raw = JSON.parse(fs.readFileSync(file, "utf8"));
        const tag = `area:foundations-${group.slug}`;
        assert.ok(
          (raw.tags || []).includes(tag) || raw.id.startsWith(`world-f1-${group.slug}-`),
          card.id
        );
      }
    }
  }
  assert.equal(counted, ages.stages.reduce((sum, stage) => sum + stage.count, 0));

  const files = ["world", "horbm", "diary"].flatMap((section) => {
    const dir = path.join(root, "data/cards", section);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => path.join(dir, name));
  });
  let markers = 0;
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const tags = (raw.tags || []).filter((tag) => String(tag).startsWith("area:foundations-"));
    const marked = tags.length > 0 || String(raw.id).startsWith("world-f1-");
    if (!marked) {
      assert.equal(seen.has(raw.id), false);
      continue;
    }
    markers += 1;
    const slugs = tags.length
      ? [...new Set(tags.map((tag) => tag.slice("area:foundations-".length)))]
      : [String(raw.id).slice("world-f1-".length).split("-")[0]];
    const homes = new Set(slugs.map((slug) => placeSlug(slug, stages)).filter(Boolean));
    const placed = slugs.every((slug) => placeSlug(slug, stages)) && homes.size === 1;
    if (placed) assert.equal(seen.has(raw.id), true);
    else assert.equal(ages.unplaced.some((card) => card.id === raw.id), true);
  }
  assert.equal(seen.size + ages.unplaced.length, markers);
});

test("brain age is the furthest filled stage with no gap from stage 1", () => {
  const gap = ages.brainAgeFrom([
    { label: "one", count: 2 },
    { label: "two", count: 0, shardCount: 0 },
    { label: "three", count: 5 },
  ]);
  assert.equal(gap.filledCount, 2);
  assert.equal(gap.stageCount, 3);
  assert.equal(gap.reachedIndex, 0);
  assert.equal(gap.reachedLabel, "one");
  assert.equal(gap.cardsHeld, 7);
  assert.equal(gap.years, "I don't know.");

  const earlier = ages.brainAgeFrom([
    { label: "one", count: 2, years: "by about 2 months (rough estimate)" },
    { label: "two", count: 0, years: "about 4 to 5 years (rough estimate)" },
    { label: "three", count: 9, years: "about 9 months to 1 year (rough estimate)" },
  ]);
  assert.equal(earlier.reachedLabel, "one");
  assert.equal(earlier.years, "by about 2 months (rough estimate)");

  const shardFills = ages.brainAgeFrom([
    { label: "one", count: 0, shardCount: 1 },
    { label: "two", count: 3 },
  ]);
  assert.equal(shardFills.filledCount, 2);
  assert.equal(shardFills.reachedLabel, "two");
  assert.equal(shardFills.cardsHeld, 4);

  const none = ages.brainAgeFrom([
    { label: "one", count: 0 },
    { label: "two", count: 4 },
  ]);
  assert.equal(none.filledCount, 1);
  assert.equal(none.reachedIndex, -1);
  assert.equal(none.reachedLabel, "");
  assert.equal(none.cardsHeld, 4);
});

test("this build's brain age uses the placed cards and does not invent years", () => {
  const held = ages.stages.reduce((sum, stage) => sum + stage.count + stage.shardCount, 0);
  const filled = ages.stages.filter((stage) => stage.count + stage.shardCount >= 1).length;
  let reached = -1;
  ages.stages.forEach((stage, index) => {
    if (reached === index - 1 && stage.count + stage.shardCount >= 1) reached = index;
  });
  assert.equal(ages.brain.stageCount, ages.stages.length);
  assert.equal(ages.brain.filledCount, filled);
  assert.equal(ages.brain.reachedIndex, reached);
  assert.equal(ages.brain.reachedLabel, reached >= 0 ? ages.stages[reached].label : "");
  assert.equal(ages.brain.cardsHeld, held);
  assert.equal(ages.brain.years, ages.stages[reached].years);
  assert.equal(ages.brain.filledCount, 3);
  assert.equal(ages.brain.cardsHeld, 163);
  assert.equal(ages.stages[2].years, "about 9 months to 1 year (rough estimate)");
  assert.deepEqual(
    ages.stages[2].sources.map((source) => source.url),
    [
      "https://www.cdc.gov/act-early/milestones/9-months.html",
      "https://www.cdc.gov/act-early/milestones/1-year.html",
    ]
  );
  for (const stage of ages.stages) {
    if (stage.years === "I don't know.") {
      assert.equal(stage.sources.length, 0);
    } else {
      assert.match(stage.years, /rough estimate/);
      assert.ok(stage.sources.length > 0);
      for (const source of stage.sources) {
        assert.match(source.url, /^https:\/\/www\.cdc\.gov\/act-early\/milestones\//);
      }
    }
  }
  const page = fs.readFileSync(path.join(root, "src/age.njk"), "utf8");
  assert.match(
    page,
    /This years line is Galion's own internal metric for estimating HORBM's knowledge, publicly disclosed\./
  );
  assert.equal(page.includes('<details class="fold age-how">'), false);
});

test("manifest figures are the publication manifest, not a recount dressed up", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "shards/manifest.json"), "utf8"));
  assert.equal(ages.manifest.schema, manifest.schema);
  assert.equal(ages.manifest.version, manifest.version);
  assert.equal(ages.manifest.cardCount, manifest.core_pack.card_count);
  assert.equal(ages.manifest.bytes, manifest.core_pack.bytes);
  assert.equal(ages.manifest.sha256, manifest.core_pack.sha256);
  assert.equal(ages.manifest.payload, manifest.core_pack.payload);
  assert.equal(ages.manifest.shardCount, manifest.shards.length);
  assert.equal(
    ages.manifest.shardCardCount,
    manifest.shards.reduce((sum, row) => sum + row.card_count, 0)
  );
  assert.equal(ages.packCount, manifest.core_pack.card_count);
});
