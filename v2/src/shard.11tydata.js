module.exports = {
  layout: "base.njk",
  pagination: {
    data: "shardPack.shards",
    size: 1,
    alias: "shard",
  },
  eleventyComputed: {
    title: (data) => (data.shard ? data.shard.title : "Shard"),
    description: (data) => (data.shard ? data.shard.scope : ""),
    permalink: (data) => (data.shard ? `shards/${data.shard.id}/index.html` : false),
  },
};
