module.exports = {
  layout: "base.njk",
  pagination: {
    data: "cards",
    size: 1,
    alias: "card",
  },
  eleventyComputed: {
    title: (data) =>
      data.card && !data.card._placeholder ? data.card.title : "Galion Knowledge",
    description: (data) =>
      data.card && !data.card._placeholder ? data.card.summary : "",
    permalink: (data) =>
      data.card && !data.card._placeholder
        ? `article/${data.card.id}/index.html`
        : false,
  },
};
