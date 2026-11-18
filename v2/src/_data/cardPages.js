const cards = require("./cards");
const shardPack = require("./shardPack");

const pages = [];
for (const card of [...cards, ...shardPack.cards]) {
  if (card._placeholder) {
    pages.push(card);
    continue;
  }
  pages.push({ ...card, slug: card.id });
  for (const alias of card.aliases || []) {
    pages.push({ ...card, slug: alias });
  }
}

module.exports = pages;
