const crypto = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
});

// Commit when git is available, otherwise a hash of the CSS and JS the query
// string is there to refresh. Either value changes the asset URL.
function assetVersion() {
  const fromEnv = (process.env.ASSET_VERSION || "").trim();
  if (/^[A-Za-z0-9._-]{4,64}$/.test(fromEnv)) return fromEnv;
  try {
    const sha = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (/^[0-9a-f]{7,40}$/.test(sha)) return sha;
  } catch {
    // A packager without a .git directory still needs a stable query string.
  }
  const hash = crypto.createHash("sha256");
  for (const file of [
    "src/assets/site.css",
    "src/assets/app.js",
    "src/assets/globe.js",
    "src/assets/vendor/three.module.min.js",
    "src/horbm/interactive/index.html",
    "src/horbm/interactive/viewer.css",
    "src/horbm/interactive/viewer.js",
    "src/horbm/interactive/diagram.css",
    "src/horbm/interactive/diagram.js",
    "src/horbm/interactive/progress.js",
    "src/horbm/interactive/github.js",
    "src/horbm/interactive/fit.js",
    "src/horbm/interactive/horbm.json",
    "src/horbm/interactive/admin/index.html",
    "src/horbm/interactive/admin/admin.css",
    "src/horbm/interactive/admin/admin.js",
  ]) {
    hash.update(fs.readFileSync(path.join(__dirname, file)));
  }
  return hash.digest("hex").slice(0, 12);
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addGlobalData("assetVersion", assetVersion());
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  // Static diagram files. HTML here is not a Nunjucks template.
  eleventyConfig.ignores.add("src/horbm/**");
  eleventyConfig.addPassthroughCopy({
    "src/horbm/horbm-layers-twoway.png": "horbm/horbm-layers-twoway.png",
  });
  eleventyConfig.addPassthroughCopy({ "src/horbm/interactive": "horbm/interactive" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/site-headers": "_headers" });
  eleventyConfig.addWatchTarget("data/cards");
  eleventyConfig.addWatchTarget("shards");
  eleventyConfig.addWatchTarget("data/catalog.json");
  eleventyConfig.addWatchTarget("data/schema.json");

  eleventyConfig.addFilter("md", (value) => markdown.render(value || ""));
  eleventyConfig.addFilter("json", (value) =>
    JSON.stringify(value).replace(/</g, "\\u003c")
  );
  eleventyConfig.addFilter("bySection", (categories, section) =>
    (categories || []).filter((category) => category.section === section)
  );
  eleventyConfig.addFilter("real", (cards) =>
    (cards || []).filter((card) => card && !card._placeholder)
  );
  eleventyConfig.addFilter("ids", (cards) =>
    (cards || []).filter((card) => card && !card._placeholder).map((card) => card.id)
  );
  eleventyConfig.addFilter("featured", (cards) => {
    const pool = (cards || []).filter((card) => card && !card._placeholder);
    const picked = [];
    const seen = new Set();
    for (const card of pool) {
      if (picked.length >= 6) break;
      if (seen.has(card.category)) continue;
      picked.push(card);
      seen.add(card.category);
    }
    for (const card of pool) {
      if (picked.length >= 6) break;
      if (!picked.includes(card)) picked.push(card);
    }
    return picked;
  });
  eleventyConfig.addFilter("inCategory", (cards, id) =>
    (cards || []).filter((card) => !card._placeholder && card.category === id)
  );
  eleventyConfig.addFilter("inSection", (cards, id) =>
    (cards || []).filter((card) => !card._placeholder && card.section === id)
  );
  eleventyConfig.addFilter("inShard", (cards, id) =>
    (cards || []).filter((card) => card && card.category === id)
  );
  eleventyConfig.addFilter("relatedTo", (cards, card) => {
    const ids = new Set((card && card.related) || []);
    const real = (cards || []).filter((item) => item && !item._placeholder);
    const found = [];
    for (const id of ids) {
      const direct = real.find((item) => item.id === id);
      const via = real.find((item) => (item.aliases || []).includes(id));
      const hit = direct || via;
      if (hit && !found.includes(hit) && hit.id !== (card && card.id)) found.push(hit);
    }
    return found;
  });
  eleventyConfig.addFilter("categoryOf", (id, catalog) => {
    const found = (catalog.categories || []).find((category) => category.id === id);
    return (
      found || {
        id: id || "unknown",
        name: id || "Unknown",
        description: "",
        color: "#60a5fa",
        icon: "book-open",
        section: "",
      }
    );
  });
  eleventyConfig.addFilter("sectionOf", (id, catalog) => {
    const found = (catalog.sections || []).find((section) => section.id === id);
    return found || { id: id || "", name: id || "", summary: "" };
  });
  eleventyConfig.addFilter("unsourcedCount", (cards) =>
    (cards || []).filter(
      (card) => !card._placeholder && /unsourced/i.test(card.status || "")
    ).length
  );
  eleventyConfig.addFilter("sourcedCount", (cards) =>
    (cards || []).filter(
      (card) =>
        !card._placeholder && (card.sources || []).some((source) => source.url)
    ).length
  );
  eleventyConfig.on("eleventy.after", ({ dir }) => {
    const repoRoot = path.resolve(__dirname, "..");
    const file = "v2/src/horbm/interactive/horbm.json";
    const git = (args) => {
      try {
        return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
      } catch {
        return "";
      }
    };
    const sha = git(["log", "-1", "--format=%H", "--", file]) || git(["rev-parse", "HEAD"]);
    const output = path.isAbsolute(dir.output) ? dir.output : path.join(process.cwd(), dir.output);
    const dest = path.join(output, "horbm/interactive/build.json");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, `${JSON.stringify({
      sha,
      short: sha.slice(0, 7),
      committed: git(["log", "-1", "--format=%cI", "--", file]),
      repo: "galion-studio/galion-knowledge",
      file,
    })}\n`);
    execFileSync(process.execPath, [
      path.join(repoRoot, "v2/tools/horbm-diagram/write-development.mjs"),
      path.dirname(dest),
    ], { cwd: repoRoot, stdio: "inherit", timeout: 20000 });
    execFileSync(process.execPath, [
      path.join(repoRoot, "v2/tools/horbm-diagram/stamp-assets.mjs"),
      path.join(output, "horbm/interactive"),
      assetVersion(),
    ], { cwd: repoRoot, stdio: "inherit", timeout: 20000 });
  });

  eleventyConfig.addFilter("searchIndex", (cards) =>
    (cards || [])
      .filter((card) => !card._placeholder)
      .map((card) => ({
        id: card.id,
        title: card.title,
        summary: card.summary,
        section: card.section,
        category: card.category,
        tags: card.tags || [],
        status: card.status,
        claim_type: card.claim_type,
        text: [card.title, card.summary, (card.tags || []).join(" "), card.body]
          .join("\n")
          .toLowerCase(),
      }))
  );

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: false,
    pathPrefix: "/",
  };
};
