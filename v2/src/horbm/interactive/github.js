// Read-only public GitHub facts for the diagram. No token and no private data.

export const REPO = "galion-studio/galion-knowledge";
export const FILE = "v2/src/horbm/interactive/horbm.json";

const ROOT = `https://github.com/${REPO}`;

export function layerLineIndex(text) {
  const lines = String(text).split("\n");
  const index = {};
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/"n": "(\d+)"/);
    if (!match) continue;
    let start = i;
    while (start > 0 && !lines[start].includes("{")) start -= 1;
    let depth = 0;
    let end = start;
    for (let line = start; line < lines.length; line += 1) {
      for (const ch of lines[line]) {
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
      }
      if (line > start && depth === 0) {
        end = line;
        break;
      }
    }
    index[match[1]] = { start: start + 1, end: end + 1 };
  }
  return index;
}

export function layersTouchedByDiff(diff, fileText) {
  const spans = Object.entries(layerLineIndex(fileText)).map(([n, span]) => ({ n, ...span }));
  const changed = new Set();
  let newLine = 0;
  const mark = (lineNo) => {
    for (const span of spans) {
      if (lineNo >= span.start && lineNo <= span.end) changed.add(span.n);
    }
  };
  for (const line of String(diff).split("\n")) {
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff ") || line.startsWith("index ")) {
      continue;
    }
    if (line.startsWith("+")) {
      mark(newLine);
      const id = line.match(/"n": "(\d+)"/);
      if (id) changed.add(id[1]);
      newLine += 1;
    } else if (line.startsWith("-")) {
      const id = line.match(/"n": "(\d+)"/);
      if (id) changed.add(id[1]);
    } else if (!line.startsWith("\\")) {
      newLine += 1;
    }
  }
  return [...changed].sort((a, b) => Number(a) - Number(b));
}

export function historyUrl() {
  return `${ROOT}/commits/master/${FILE}`;
}

export function commitUrl(sha) {
  return `${ROOT}/commit/${sha}`;
}

export function pullUrl(number) {
  return `${ROOT}/pull/${number}`;
}

export function shortSha(sha) {
  return String(sha || "").slice(0, 7);
}

export function pullNumber(title) {
  const match = String(title || "").match(/\(#(\d+)\)\s*$/);
  return match ? Number(match[1]) : null;
}

export function agoLabel(iso, now = Date.now()) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(then).toISOString().slice(0, 10);
}

const DIAGRAM_PATHS = [
  "v2/src/horbm/",
  "v2/tools/horbm-diagram/",
  ".github/workflows/horbm-diagram.yml",
];

export function touchesDiagram(files) {
  return (files || []).some((file) => {
    const name = typeof file === "string" ? file : file.filename;
    return DIAGRAM_PATHS.some((prefix) => name === prefix || String(name || "").startsWith(prefix));
  });
}

export function isDiagramPull(pull) {
  const text = `${pull.title || ""}\n${pull.body || ""}`.toLowerCase();
  return text.includes("horbm.json")
    || text.includes("interactive diagram")
    || text.includes("/horbm/interactive");
}

export function pullsFromCommits(commits) {
  const pulls = [];
  const seen = new Set();
  for (const commit of commits || []) {
    if (!commit.pr || seen.has(commit.pr)) continue;
    seen.add(commit.pr);
    pulls.push({
      number: commit.pr,
      title: String(commit.title || "").replace(/\s*\(#\d+\)\s*$/, ""),
      state: "merged",
      at: commit.at || "",
      url: commit.prUrl || pullUrl(commit.pr),
    });
  }
  return pulls;
}

export function normalizeApiCommit(item) {
  const sha = item.sha || "";
  const title = String((item.commit && item.commit.message) || "").split("\n")[0];
  const at = item.commit && item.commit.committer && item.commit.committer.date;
  return {
    sha,
    short: shortSha(sha),
    at: at || "",
    title,
    url: commitUrl(sha),
    pr: pullNumber(title),
    layers: [],
  };
}

export function normalizeRun(run) {
  return {
    name: run.name || run.context || "Check",
    status: run.status || "",
    conclusion: run.conclusion || run.state || "",
    at: run.updated_at || run.created_at || "",
    sha: shortSha(run.head_sha || ""),
    url: run.html_url || run.target_url || "",
    branch: run.head_branch || "",
  };
}

export function normalizePull(item) {
  const state = item.merged_at ? "merged" : item.state;
  return {
    number: item.number,
    title: item.title,
    state,
    at: item.merged_at || item.updated_at || item.created_at || "",
    url: item.html_url || pullUrl(item.number),
  };
}

export function mergeFeed(baked, apiCommits, apiPulls) {
  const bySha = new Map();
  for (const commit of (baked && baked.commits) || []) bySha.set(commit.sha, { ...commit });
  for (const commit of apiCommits || []) {
    const existing = bySha.get(commit.sha);
    if (existing) {
      bySha.set(commit.sha, {
        ...commit,
        layers: existing.layers || [],
        pr: existing.pr || commit.pr,
      });
    } else {
      bySha.set(commit.sha, commit);
    }
  }
  const commits = [...bySha.values()]
    .filter((commit) => commit.sha)
    .sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0))
    .slice(0, 12);
  const byNumber = new Map();
  const addPull = (pull) => {
    if (!pull || pull.state === "closed" || pull.number == null) return;
    const previous = byNumber.get(pull.number);
    if (!previous) {
      byNumber.set(pull.number, { ...pull, layers: pull.layers || [], user: pull.user || "" });
      return;
    }
    byNumber.set(pull.number, {
      ...previous,
      ...pull,
      layers: (pull.layers && pull.layers.length) ? pull.layers : (previous.layers || []),
      user: pull.user || previous.user || "",
    });
  };
  for (const pull of (baked && baked.pulls) || []) addPull(pull);
  for (const pull of apiPulls || []) addPull(pull);
  for (const pull of pullsFromCommits(commits)) {
    if (!byNumber.has(pull.number)) addPull(pull);
  }
  const pulls = [...byNumber.values()];
  pulls.sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0));
  const head = commits[0];
  return {
    sha: head ? head.sha : (baked && baked.sha) || "",
    short: head ? head.short : (baked && baked.short) || "",
    committed: head ? head.at : (baked && baked.committed) || "",
    commits,
    pulls: pulls.slice(0, 8),
  };
}
