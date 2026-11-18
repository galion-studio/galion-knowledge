module.exports = {
  layout: "base.njk",
  pagination: {
    data: "catalog.sections",
    size: 1,
    alias: "section",
  },
  eleventyComputed: {
    title: (data) => data.section.name,
    description: (data) => data.section.summary,
    permalink: (data) => `section/${data.section.id}/index.html`,
  },
};
