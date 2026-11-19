import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  commitUrl,
  editUrl,
  historyUrl,
  layerLineIndex,
  proposeUrl,
  pullsUrl,
  shortSha,
} from "../../src/horbm/interactive/github.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../src/horbm/interactive");
const text = readFileSync(join(root, "horbm.json"), "utf8");
const data = JSON.parse(text);

test("every layer has a GitHub line range inside horbm.json", () => {
  const index = layerLineIndex(text);
  const lines = text.split("\n");
  for (const band of data.bands) {
    for (const layer of band.layers) {
      const span = index[layer.n];
      assert.ok(span, `layer ${layer.n}`);
      const block = lines.slice(span.start - 1, span.end).join("\n");
      assert.match(block, new RegExp(`"n": "${layer.n}"`));
      assert.ok(block.includes(layer.title), layer.title);
      const url = editUrl(span);
      assert.match(url, new RegExp(`#L${span.start}-L${span.end}$`));
      assert.equal(url.includes("github.com/galion-studio/galion-knowledge/blob/master/"), true);
    }
  }
});

test("history, pulls, commit, and propose links stay on the public repository", () => {
  assert.equal(
    historyUrl(),
    "https://github.com/galion-studio/galion-knowledge/commits/master/v2/src/horbm/interactive/horbm.json",
  );
  assert.match(pullsUrl(), /\/pulls\?q=/);
  assert.equal(commitUrl("abcdef0123456789"), "https://github.com/galion-studio/galion-knowledge/commit/abcdef0123456789");
  assert.equal(shortSha("abcdef0123456789"), "abcdef0");
  const layer = data.bands[0].layers[0];
  const issue = proposeUrl(layer);
  const parsed = new URL(issue);
  assert.equal(parsed.origin + parsed.pathname, "https://github.com/galion-studio/galion-knowledge/issues/new");
  assert.equal(parsed.searchParams.get("body").includes(`Layer ${layer.n}. ${layer.title}`), true);
  assert.equal(issue.includes("wikipedia.org"), false);
});
