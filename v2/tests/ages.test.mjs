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
