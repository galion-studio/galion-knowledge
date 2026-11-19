// Rewrites the built interactive page so CSS, JS, and JSON URLs carry ?v=<commit>.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FILE = String.raw`(?:\.\./|\./)*[\w./-]+\.(?:css|js|json)`;

export function stampAssetUrls(source, version) {
  if (!/^[A-Za-z0-9._-]{4,64}$/.test(version)) {
    throw new Error("Asset version is not safe to put in a URL.");
  }
  const patterns = [
    new RegExp(String.raw`(\bfrom\s*["'])(${FILE})(["'])`, "g"),
    new RegExp(String.raw`(new\s+URL\(\s*["'])(${FILE})(["'])`, "g"),
    new RegExp(String.raw`((?:href|src)\s*=\s*["'])(${FILE})(["'])`, "g"),
  ];
  return patterns.reduce(
    (text, pattern) => text.replace(pattern, (_match, open, url, close) => `${open}${url}?v=${version}${close}`),
    source,
  );
}

function walk(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (/\.(?:html|js)$/.test(name) && !name.endsWith(".min.js")) found.push(full);
  }
  return found;
}

export function stampTree(root, version) {
  const files = walk(root);
  let changed = 0;
  for (const file of files) {
    const before = readFileSync(file, "utf8");
    const after = stampAssetUrls(before, version);
    if (after !== before) {
      writeFileSync(file, after);
      changed += 1;
    }
  }
  return changed;
}

const invoked = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const root = process.argv[2];
  const version = process.argv[3];
  if (!root || !version) {
    console.error("usage: stamp-assets.mjs <output-dir> <version>");
    process.exit(1);
  }
  const changed = stampTree(path.resolve(root), version);
  console.log(`stamped ${changed} interactive files with v=${version}`);
}
