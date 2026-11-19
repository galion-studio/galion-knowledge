import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  agoLabel,
  commitUrl,
  historyUrl,
  isDiagramPull,
  layersTouchedByDiff,
  pullsFromCommits,
  touchesDiagram,
  mergeFeed,
  normalizeApiCommit,
  normalizePull,
  pullNumber,
  shortSha,
} from "../../src/horbm/interactive/github.js";

const here = dirname(fileURLToPath(import.meta.url));
const page = join(here, "../../src/horbm/interactive");

test("a diagram diff names the layers whose lines changed", () => {
  const file = [
    "{",
    '  "bands": [',
    "    {",
    '      "layers": [',
    "        {",
    '          "n": "1",',
    '          "title": "Voice"',
    "        },",
    "        {",
    '          "n": "4",',
    '          "title": "Policy"',
    "        }",
    "      ]",
    "    }",
    "  ]",
    "}",
    "",
  ].join("\n");
  const diff = [
    "diff --git a/horbm.json b/horbm.json",
    "--- a/horbm.json",
    "+++ b/horbm.json",
    "@@ -8,7 +8,7 @@",
    "         },",
    "         {",
    '           "n": "4",',
    '-          "title": "Dialogue"',
    '+          "title": "Policy"',
    "         }",
    "       ]",
  ].join("\n");
  assert.deepEqual(layersTouchedByDiff(diff, file), ["4"]);
});

test("relative time and public view links stay read-only", () => {
  const now = Date.parse("2026-11-19T18:00:00Z");
  assert.equal(agoLabel("2026-11-19T17:00:00Z", now), "1 hour ago");
  assert.equal(agoLabel("2026-11-19T17:58:00Z", now), "2 minutes ago");
  assert.equal(pullNumber("Accept the diagram (#34)"), 34);
  assert.equal(pullNumber("no number here"), null);
  assert.equal(commitUrl("abcdef0123456789"), "https://github.com/galion-studio/galion-knowledge/commit/abcdef0123456789");
  assert.equal(shortSha("abcdef0123456789"), "abcdef0");
  assert.equal(
    historyUrl(),
    "https://github.com/galion-studio/galion-knowledge/commits/master/v2/src/horbm/interactive/horbm.json",
  );
  assert.equal(historyUrl().includes("/edit/"), false);
  assert.equal(historyUrl().includes("issues/new"), false);
});

test("the public page has no edit or propose controls", () => {
  const html = readFileSync(join(page, "index.html"), "utf8");
  const viewer = readFileSync(join(page, "viewer.js"), "utf8");
  for (const source of [html, viewer]) {
    assert.equal(source.includes("Edit on GitHub"), false);
    assert.equal(source.includes("Propose a change"), false);
    assert.equal(source.includes("issues/new"), false);
    assert.equal(source.includes("/edit/"), false);
  }
  assert.equal(html.includes("Live development"), true);
});

test("a public refresh keeps baked layer numbers and drops closed pull requests", () => {
  const baked = {
    sha: "aaa",
    commits: [{ sha: "aaa", short: "aaa", at: "2026-11-19T12:00:00Z", title: "First (#30)", pr: 30, layers: ["4"] }],
    pulls: [],
  };
  const apiCommits = [normalizeApiCommit({
    sha: "bbb",
    commit: { message: "Second\n\nbody", committer: { date: "2026-11-19T16:00:00Z" } },
  })];
  const open = [
    normalizePull({ number: 34, title: "HORBM diagram", state: "open", updated_at: "2026-11-19T15:00:00Z", html_url: "https://github.com/galion-studio/galion-knowledge/pull/34" }),
    normalizePull({ number: 9, title: "HORBM old", state: "closed", updated_at: "2026-11-18T15:00:00Z", html_url: "https://github.com/galion-studio/galion-knowledge/pull/9" }),
  ].filter((pull) => pull.state !== "closed");
  const feed = mergeFeed(baked, apiCommits, open);
  assert.equal(feed.commits[0].sha, "bbb");
  assert.deepEqual(feed.commits.find((commit) => commit.sha === "aaa").layers, ["4"]);
  assert.deepEqual(feed.pulls.map((pull) => pull.number), [34, 30]);
  assert.equal(feed.pulls[0].url.endsWith("/pull/34"), true);
  assert.equal(isDiagramPull({ title: "HORBM layers", body: "cards only" }), false);
  assert.equal(isDiagramPull({ title: "Diagram", body: "edit horbm.json" }), true);
  assert.equal(touchesDiagram([{ filename: "v2/src/horbm/interactive/horbm.json" }]), true);
  assert.equal(touchesDiagram([{ filename: "v2/src/nav.njk" }]), false);
  assert.equal(pullsFromCommits([{ sha: "abc", title: "Add the diagram (#30)", at: "2026-11-19T12:00:00Z", pr: 30 }])[0].state, "merged");
});
