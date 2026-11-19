// Bakes a read-only development feed from git, then adds public pull requests when the API answers.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  REPO,
  commitUrl,
  layersTouchedByDiff,
  normalizePull,
  pullNumber,
  pullUrl,
  pullsFromCommits,
  shortSha,
  touchesDiagram,
} from "../../src/horbm/interactive/github.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const diagramFile = "v2/src/horbm/interactive/horbm.json";
const paths = [
  diagramFile,
  "v2/src/horbm/horbm-layers-twoway.png",
  "v2/src/horbm/interactive/diagram.js",
  "v2/src/horbm/interactive/diagram.css",
];

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" });
}

function gitQuiet(args) {
  try {
    return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

export function commitsFromGit() {
  const raw = git(["log", "-12", `--format=%H%x1f%cI%x1f%s`, "--", ...paths]).trim();
  if (!raw) return [];
  return raw.split("\n").filter(Boolean).map((row) => {
    const [sha, at, title] = row.split("\x1f");
    const file = gitQuiet(["show", `${sha}:${diagramFile}`]);
    const diff = gitQuiet(["diff", `${sha}^`, sha, "--", diagramFile]);
    const pr = pullNumber(title);
    return {
      sha,
      short: shortSha(sha),
      at,
      title,
      url: commitUrl(sha),
      pr,
      prUrl: pr ? pullUrl(pr) : "",
      layers: file && diff ? layersTouchedByDiff(diff, file) : [],
    };
  });
}

async function openDiagramPulls() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "galion-knowledge",
  };
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/pulls?state=open&sort=updated&direction=desc&per_page=20`,
    { headers, signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) return [];
  const pulls = [];
  for (const item of await response.json()) {
    const files = await fetch(
      `https://api.github.com/repos/${REPO}/pulls/${item.number}/files?per_page=100`,
      { headers, signal: AbortSignal.timeout(8000) },
    );
    if (!files.ok) continue;
    if (!touchesDiagram(await files.json())) continue;
    const pull = normalizePull(item);
    if (pull.state === "closed") continue;
    pulls.push(pull);
  }
  return pulls;
}

const outputDir = path.resolve(process.argv[2] || path.join(repoRoot, "v2/_site/horbm/interactive"));
const head = gitQuiet(["log", "-1", "--format=%H%x1f%cI", "--", diagramFile]).trim().split("\x1f");
const feed = {
  sha: head[0] || gitQuiet(["rev-parse", "HEAD"]).trim(),
  short: shortSha(head[0] || ""),
  committed: head[1] || "",
  commits: commitsFromGit(),
  pulls: [],
};
try {
  const open = await openDiagramPulls();
  const byNumber = new Map();
  for (const pull of pullsFromCommits(feed.commits)) byNumber.set(pull.number, pull);
  for (const pull of open) byNumber.set(pull.number, pull);
  feed.pulls = [...byNumber.values()].sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0));
} catch {
  feed.pulls = pullsFromCommits(feed.commits);
}
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, "development.json"), `${JSON.stringify(feed)}\n`);
console.log(`wrote ${feed.commits.length} commits and ${feed.pulls.length} pull requests`);
