module.exports = {
  layout: "base.njk",
  pagination: {
    data: "cardPages",
    size: 1,
    alias: "card",
  },
  eleventyComputed: {
    title: (data) =>
      data.card && !data.card._placeholder ? data.card.title : "Galion Knowledge",
    description: (data) =>
      data.card && !data.card._placeholder ? data.card.summary : "",
    permalink: (data) => {
      const card = data.card;
      if (!card || card._placeholder) return false;
      return `article/${card.slug || card.id}/index.html`;
    },
  },
};
