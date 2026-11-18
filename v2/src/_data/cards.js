const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..", "data", "cards");
const SECTIONS = ["world", "horbm", "diary"];
const CLAIMS = new Set(["fact", "interpretation", "opinion", "contested"]);
const STRENGTH = new Set(["none", "weak", "moderate", "strong"]);
const ID_RE = /^[a-z0-9]+([.-][a-z0-9]+)*$/;
const DATE_RE = /^$|^-?[0-9]{1,6}(-[0-9]{2}){0,2}$/;
const ACCESSED_RE = /^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const URL_RE = /^$|^https?:\/\/\S+$/;
const IP_RE = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/;

const REQUIRED = [
  "id",
  "title",
  "section",
  "category",
  "body",
  "claim_type",
  "sources",
  "evidence_strength",
  "said_by",
  "as_of_date",
  "status",
  "contested_views",
  "related",
];

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

function scanText(file, label, value) {
  if (typeof value === "string" && IP_RE.test(value)) {
    fail(file, `${label} contains an IP address`);
  }
}

function checkSource(file, source, index) {
  if (!source || typeof source !== "object") {
    fail(file, `sources[${index}] must be an object`);
  }
  for (const key of ["title", "url", "author", "date", "accessed"]) {
    if (typeof source[key] !== "string") {
      fail(file, `sources[${index}].${key} must be a string`);
    }
  }
  if (!source.title.trim()) fail(file, `sources[${index}].title is empty`);
  if (!URL_RE.test(source.url)) {
    fail(file, `sources[${index}].url must be http(s) or empty`);
  }
  if (!ACCESSED_RE.test(source.accessed)) {
    fail(file, `sources[${index}].accessed must be YYYY-MM-DD or empty`);
  }
  scanText(file, `sources[${index}].url`, source.url);
}

function checkCard(file, section, card) {
  if (!card || typeof card !== "object" || Array.isArray(card)) {
    fail(file, "card must be a JSON object");
  }
  for (const key of REQUIRED) {
    if (!(key in card)) fail(file, `missing ${key}`);
  }
  const id = path.basename(file, ".json");
  if (card.id !== id) fail(file, `id "${card.id}" must match the file name`);
  if (!ID_RE.test(card.id)) fail(file, "id must be a lowercase slug");
  if (card.section !== section) {
    if (SECTIONS.includes(card.section)) {
      fail(file, `section "${card.section}" must match the folder "${section}"`);
    }
    // A draft pack used its own section words inside cards/horbm/.
    // The folder is the pack the site lists.
    card.section = section;
  }
  if (typeof card.title !== "string" || !card.title.trim()) fail(file, "title is empty");
  if (typeof card.category !== "string" || !card.category.trim()) {
    fail(file, "category is empty");
  }
  if (typeof card.summary !== "string" || !card.summary.trim()) {
    const flat = String(card.body || "").replace(/\s+/g, " ").trim();
    card.summary = (flat.slice(0, 180) || card.title).trim();
  }
  if (typeof card.body !== "string" || !card.body.trim()) fail(file, "body is empty");
  if (!CLAIMS.has(card.claim_type)) fail(file, "claim_type is not allowed");
  if (typeof card.evidence_strength !== "string" || !card.evidence_strength.trim()) {
    fail(file, "evidence_strength is empty");
  }
  if (!STRENGTH.has(card.evidence_strength)) {
    card.evidence_strength_raw = card.evidence_strength;
  }
  if (typeof card.said_by !== "string") fail(file, "said_by must be a string");
  if (typeof card.as_of_date !== "string" || !DATE_RE.test(card.as_of_date)) {
    fail(file, "as_of_date must be empty, YYYY, YYYY-MM, or YYYY-MM-DD");
  }
  if (typeof card.status !== "string" || !card.status.trim()) fail(file, "status is empty");
  if (!Array.isArray(card.sources)) fail(file, "sources must be an array");
  card.sources.forEach((source, index) => checkSource(file, source, index));
  if (/unsourced/i.test(card.status) && card.sources.length) {
    fail(file, "an unsourced card must have an empty sources array");
  }
  if (card.claim_type === "fact" && !card.sources.some((source) => source.url)) {
    fail(file, "a fact card needs a source with a url");
  }
  if (!Array.isArray(card.contested_views)) fail(file, "contested_views must be an array");
  card.contested_views = card.contested_views.map((view, index) => {
    if (!view || typeof view !== "object") {
      fail(file, `contested_views[${index}] must be an object`);
    }
    const label = String(view.label || view.position || "").trim();
    const summary = String(view.summary || view.position || "").trim();
    if (!label || !summary) fail(file, `contested_views[${index}] needs a label or a position`);
    const normalized = {
      label,
      summary,
      status: String(view.status || (typeof view.source === "string" ? view.source : "")),
    };
    if (Array.isArray(view.sources)) {
      view.sources.forEach((source, sourceIndex) =>
        checkSource(file, source, `${index}.${sourceIndex}`)
      );
      normalized.sources = view.sources;
    }
    return normalized;
  });
  if (!Array.isArray(card.related)) fail(file, "related must be an array");
  card.related.forEach((relatedId) => {
    if (typeof relatedId !== "string" || !relatedId.trim()) {
      fail(file, "related ids must be strings");
    }
  });
  if (card.tags !== undefined) {
    if (!Array.isArray(card.tags)) fail(file, "tags must be an array");
    card.tags.forEach((tag) => {
      if (typeof tag !== "string" || !tag.trim()) fail(file, "tags must be strings");
    });
  } else {
    card.tags = [];
  }
  if (card.read_time_min !== undefined) {
    if (!Number.isInteger(card.read_time_min) || card.read_time_min < 1) {
      fail(file, "read_time_min must be a positive integer");
    }
  } else {
    const words = (card.body.match(/[A-Za-z0-9']+/g) || []).length;
    card.read_time_min = Math.max(1, Math.round(words / 220));
  }
  for (const label of ["title", "summary", "body", "said_by", "status"]) {
    scanText(file, label, card[label]);
  }
  return card;
}

function readSection(section) {
  const dir = path.join(ROOT, section);
  if (!fs.existsSync(dir)) return [];
  const cards = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      fail(full, "use v2/data/cards/<section>/<id>.json, with no extra folders");
    }
    if (!name.endsWith(".json")) continue;
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (error) {
      fail(full, `invalid JSON (${error.message})`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || typeof parsed.id !== "string") {
      continue;
    }
    cards.push(checkCard(path.relative(path.join(ROOT, "..", ".."), full), section, parsed));
  }
  return cards;
}

function load() {
  if (!fs.existsSync(ROOT)) return [];
  for (const name of fs.readdirSync(ROOT)) {
    const full = path.join(ROOT, name);
    if (fs.statSync(full).isFile()) {
      fail(full, "put cards in world/, horbm/, or diary/");
    }
    if (fs.statSync(full).isDirectory() && !SECTIONS.includes(name)) {
      fail(full, "unknown card folder");
    }
  }
  const cards = SECTIONS.flatMap(readSection);
  const seen = new Set();
  for (const card of cards) {
    if (seen.has(card.id)) fail(card.id, "duplicate id");
    seen.add(card.id);
  }
  cards.sort((a, b) => a.title.localeCompare(b.title, "en"));
  return cards;
}

const cards = load();

module.exports = cards.length
  ? cards
  : [
      {
        _placeholder: true,
        id: "placeholder",
        title: "",
        section: "world",
        category: "science",
        summary: "",
        body: "",
        claim_type: "interpretation",
        sources: [],
        evidence_strength: "none",
        said_by: "",
        as_of_date: "",
        status: "unsourced - needs review",
        contested_views: [],
        related: [],
        tags: [],
        read_time_min: 1,
      },
    ];
