const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const V2 = path.join(__dirname, "..", "..");
const SHARDS = path.join(V2, "shards");
const CORE = path.join(V2, "data", "cards");
const ID_RE = /^[a-z0-9]+([.-][a-z0-9]+)*$/;
const IP_RE = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/;
const CLAIMS = new Set(["fact", "interpretation", "opinion", "contested"]);
const STRENGTH = new Set(["none", "weak", "moderate", "strong"]);

function fail(message) {
  throw new Error(`shards: ${message}`);
}

function bundle(files) {
  const parts = [];
  const ordered = [...files].sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  for (const file of ordered) {
    const data = fs.readFileSync(file.path);
    if (!data.length || data[data.length - 1] !== 0x0a) {
      fail(`${file.rel} must end with a newline`);
    }
    parts.push(Buffer.from(`${file.rel}\n`));
    parts.push(data);
    parts.push(Buffer.from("\n"));
  }
  return Buffer.concat(parts);
}

function digest(buffer) {
  return {
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    bytes: buffer.length,
  };
}

function walkJson(dir, base, acc) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkJson(full, base, acc);
    else if (name.endsWith(".json")) {
      acc.push({ rel: path.relative(base, full).split(path.sep).join("/"), path: full });
    }
  }
}

function checkCard(file, shardId, card) {
  if (!card || typeof card !== "object" || Array.isArray(card)) fail(`${file} is not an object`);
  const base = path.basename(file, ".json");
  if (card.id !== base) fail(`${file} id must match the file name`);
  if (!ID_RE.test(card.id)) fail(`${card.id} is not a slug`);
  if (card.section !== "shards") fail(`${card.id} section must be shards`);
  if (card.category !== shardId) fail(`${card.id} category must be ${shardId}`);
  if (typeof card.title !== "string" || !card.title.trim()) fail(`${card.id} title`);
  if (typeof card.summary !== "string" || !card.summary.trim()) fail(`${card.id} summary`);
  if (typeof card.body !== "string" || !card.body.trim()) fail(`${card.id} body`);
  if (!CLAIMS.has(card.claim_type)) fail(`${card.id} claim_type`);
  if (!STRENGTH.has(card.evidence_strength)) fail(`${card.id} evidence_strength`);
  if (!Array.isArray(card.sources)) fail(`${card.id} sources`);
  for (const source of card.sources) {
    for (const key of ["title", "url", "author", "date", "accessed"]) {
      if (typeof source[key] !== "string") fail(`${card.id} source.${key}`);
    }
    if (!source.title.trim()) fail(`${card.id} empty source title`);
    if (source.url && !/^https?:\/\/\S+$/.test(source.url)) fail(`${card.id} bad url`);
  }
  if (card.claim_type === "fact" && !card.sources.some((source) => source.url)) {
    fail(`${card.id} fact needs a url`);
  }
  if (!Array.isArray(card.contested_views) || !Array.isArray(card.related)) {
    fail(`${card.id} arrays`);
  }
  const blob = JSON.stringify(card);
  if (IP_RE.test(blob)) fail(`${card.id} contains an IP address`);
  if (!Number.isInteger(card.read_time_min) || card.read_time_min < 1) {
    const words = (card.body.match(/[A-Za-z0-9']+/g) || []).length;
    card.read_time_min = Math.max(1, Math.round(words / 220));
  }
  if (!Array.isArray(card.tags)) card.tags = [];
  return card;
}

function load() {
  const manifestPath = path.join(SHARDS, "manifest.json");
  if (!fs.existsSync(manifestPath)) fail("manifest.json is missing");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.schema !== "galion-shard-manifest/1") fail("manifest schema");
  if (manifest.immutable !== true) fail("manifest must be immutable");
  if (!manifest.core_pack || manifest.core_pack.id !== "core") fail("core pack id");

  const coreFiles = [];
  walkJson(CORE, CORE, coreFiles);
  const coreDigest = digest(bundle(coreFiles));
  if (coreDigest.sha256 !== manifest.core_pack.sha256 || coreDigest.bytes !== manifest.core_pack.bytes) {
    fail(
      `core bundle hash does not match manifest (computed ${coreDigest.sha256} ${coreDigest.bytes} bytes)`
    );
  }

  const dirs = fs
    .readdirSync(SHARDS)
    .filter((name) => fs.statSync(path.join(SHARDS, name)).isDirectory())
    .sort();
  const byId = new Map();
  for (const id of dirs) {
    const metaPath = path.join(SHARDS, id, "shard.json");
    if (!fs.existsSync(metaPath)) fail(`${id} has no shard.json`);
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    if (meta.schema !== "galion-shard-manifest/1") fail(`${id} schema`);
    if (meta.id !== id) fail(`${id} shard.json id`);
    if (!Array.isArray(meta.depends_on) || !meta.depends_on.includes("core")) {
      fail(`${id} must depend on core`);
    }
    const cardDir = path.join(SHARDS, id, "cards");
    const files = [];
    if (fs.existsSync(cardDir)) {
      for (const name of fs.readdirSync(cardDir)) {
        if (!name.endsWith(".json")) continue;
        files.push({ rel: `cards/${name}`, path: path.join(cardDir, name) });
      }
    }
    const hashed = digest(bundle(files));
    if (hashed.sha256 !== meta.sha256 || hashed.bytes !== meta.bytes) {
      fail(`${id} sha256 does not match its cards`);
    }
    if (meta.card_count !== files.length) fail(`${id} card_count`);
    const cards = files
      .sort((a, b) => (a.rel < b.rel ? -1 : 1))
      .map((file) => checkCard(file.path, id, JSON.parse(fs.readFileSync(file.path, "utf8"))));
    byId.set(id, { ...meta, cards });
  }

  if (!Array.isArray(manifest.shards)) fail("manifest shards");
  const shards = [];
  const seen = new Set();
  for (const row of manifest.shards) {
    const meta = byId.get(row.id);
    if (!meta) fail(`manifest names ${row.id} but there is no directory`);
    for (const key of ["sha256", "bytes", "card_count", "section", "category"]) {
      if (row[key] !== meta[key]) fail(`manifest ${row.id} ${key} does not match shard.json`);
    }
    if (!Array.isArray(row.depends_on) || row.depends_on[0] !== "core") {
      fail(`manifest ${row.id} depends_on`);
    }
    shards.push(meta);
    seen.add(row.id);
  }
  for (const id of byId.keys()) {
    if (!seen.has(id)) fail(`${id} is not in the manifest`);
  }

  const cards = shards.flatMap((shard) => shard.cards);
  const ids = new Set();
  for (const card of cards) {
    if (ids.has(card.id)) fail(`duplicate ${card.id}`);
    ids.add(card.id);
  }
  return {
    manifest,
    shards: shards.map(({ cards: _cards, ...meta }) => meta),
    cards,
  };
}

module.exports = load();
