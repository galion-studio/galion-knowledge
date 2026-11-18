module.exports = {
  layout: "base.njk",
  pagination: {
    data: "catalog.categories",
    size: 1,
    alias: "category",
  },
  eleventyComputed: {
    title: (data) => data.category.name,
    description: (data) => data.category.description,
    permalink: (data) => `category/${data.category.id}/index.html`,
  },
};
