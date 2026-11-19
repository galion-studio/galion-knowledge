// Public GitHub links for the diagram. No token and no private data.

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

export function editUrl(span) {
  const base = `${ROOT}/blob/master/${FILE}`;
  if (!span) return base;
  const mark = span.start === span.end ? `L${span.start}` : `L${span.start}-L${span.end}`;
  return `${base}#${mark}`;
}

export function historyUrl() {
  return `${ROOT}/commits/master/${FILE}`;
}

export function pullsUrl() {
  return `${ROOT}/pulls?q=${encodeURIComponent("is:pr horbm.json")}`;
}

export function commitUrl(sha) {
  return `${ROOT}/commit/${sha}`;
}

export function shortSha(sha) {
  return String(sha || "").slice(0, 7);
}

export function proposeUrl(layer) {
  const title = layer
    ? `HORBM diagram: change layer ${layer.n}`
    : "HORBM diagram: proposed change";
  const where = layer ? `Layer ${layer.n}. ${layer.title}` : "The whole diagram";
  const body = [
    where,
    "",
    "What should change:",
    "",
    "",
    `File: ${FILE}`,
    "Edit that file in a pull request. CI checks the JSON and regenerates the PNG.",
  ].join("\n");
  const params = new URLSearchParams({ title, body });
  return `${ROOT}/issues/new?${params.toString()}`;
}
