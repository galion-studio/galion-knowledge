const cards = require("./cards");
const shardPack = require("./shardPack");

const core = cards.filter((card) => card && !card._placeholder);
const ids = new Set(core.map((card) => card.id));
for (const card of shardPack.cards) {
  if (ids.has(card.id)) {
    throw new Error(`shard card duplicates a core id: ${card.id}`);
  }
  ids.add(card.id);
}

module.exports = [...core, ...shardPack.cards];
