import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { stampAssetUrls } from "./stamp-assets.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../src/horbm/interactive");
const version = "abc123def456";

function stamped(name) {
  return stampAssetUrls(readFileSync(join(root, name), "utf8"), version);
}

test("interactive and admin assets get the same commit query", () => {
  const page = stamped("index.html");
  const viewer = stamped("viewer.js");
  const adminPage = stamped("admin/index.html");
  const admin = stamped("admin/admin.js");
  const all = [page, viewer, adminPage, admin].join("\n");
  for (const name of [
    "viewer.css",
    "diagram.css",
    "viewer.js",
    "diagram.js",
    "progress.js",
    "github.js",
    "fit.js",
    "horbm.json",
    "build.json",
    "development.json",
    "admin.css",
    "admin.js",
    "html2canvas.min.js",
  ]) {
    assert.ok(all.includes(`${name}?v=${version}`), name);
  }
  assert.match(viewer, /horbm\.json&sha=master/);
  assert.equal(all.includes(`horbm.json?v=${version}&sha`), false);
  assert.equal(stampAssetUrls(page, version), page);
});

test("the public page does not link the admin board or offer edits", () => {
  const page = readFileSync(join(root, "index.html"), "utf8");
  assert.equal(page.includes("interactive/admin"), false);
  assert.equal(/propose/i.test(page), false);
  assert.equal(page.includes("HORBM …%"), false);
  assert.equal(page.includes("...%"), false);
});
