const catalog = require("./catalog");
const cards = require("./cards");

const known = new Map(catalog.categories.map((category) => [category.id, category]));
const palette = ["#60a5fa", "#f59e0b", "#a855f7", "#22c55e", "#ef4444", "#14b8a6", "#eab308", "#ec4899", "#8b5cf6", "#f97316", "#06b6d4", "#94a3b8"];

function colorFor(id) {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

const extras = [];
for (const card of cards) {
  if (card._placeholder || known.has(card.category)) continue;
  known.set(card.category, {
    id: card.category,
    section: card.section,
    name: card.category.replace(/-/g, " "),
    description: "",
    color: colorFor(card.category),
    icon: "book-open",
  });
  extras.push(card.category);
}

module.exports = [...catalog.categories, ...[...known.values()].filter((category) => extras.includes(category.id))];
