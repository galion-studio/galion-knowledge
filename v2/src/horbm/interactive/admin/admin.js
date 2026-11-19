import { escapeHtml } from "../diagram.js";
import {
  agoLabel,
  commitUrl,
  isDiagramPull,
  mergeFeed,
  normalizeApiCommit,
  normalizePull,
  normalizeRun,
  shortSha,
} from "../github.js";
import { countStates, layerPercent, layersOf, overallPercent } from "../progress.js";

const REFRESH_MS = 5 * 60 * 1000;
const HEADERS = { Accept: "application/vnd.github+json" };
const REPO = "galion-studio/galion-knowledge";

let published = null;
let feed = { commits: [], pulls: [] };
let runs = [];
let heads = [];
let readAt = 0;

function text(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function stateLabel(state) {
  if (state === "in progress") return "In progress";
  if (state === "done") return "Done";
  if (state === "blocked") return "Blocked";
  return "Planned";
}

function assignment(build) {
  const agent = build && build.agent ? build.agent : "unassigned";
  const pr = build && build.pr ? ` · pull request ${build.pr}` : "";
  const note = build && build.note ? ` · ${build.note}` : "";
  return `${agent}${pr}${note}`;
}

function render() {
  if (!published) return;
  text("overall", String(overallPercent(published)));
  const counts = countStates(published);
  document.getElementById("counts").innerHTML = Object.entries(counts).map(([state, count]) =>
    `<li><b>${count}</b>${escapeHtml(stateLabel(state))}</li>`).join("");
  document.getElementById("heads").innerHTML = heads.flatMap((head) => {
    if (!layersOf(head.data).some((layer) => layer.build)) return [];
    const percent = overallPercent(head.data);
    if (percent === overallPercent(published)) return [];
    const who = head.user ? ` by ${escapeHtml(head.user)}` : "";
    return [`<p>Open pull request ${head.number}${who}: ${percent}% on that branch</p>`];
  }).join("");
  document.getElementById("layers").innerHTML = layersOf(published).map((layer) => {
    const percent = layerPercent(layer);
    const build = layer.build || {};
    const changes = heads.flatMap((head) => {
      const next = layersOf(head.data).find((item) => item.n === layer.n);
      if (!next || !next.build) return [];
      const same = next.build.percent === build.percent
        && next.build.state === build.state
        && next.build.agent === build.agent
        && next.build.pr === build.pr;
      if (same) return [];
      const who = next.build.agent || head.user || "unassigned";
      return [`Pull request ${head.number}: ${next.build.percent}% ${stateLabel(next.build.state).toLowerCase()}, ${who}`];
    });
    return `<article class="card"><div class="row"><div><div class="title">${escapeHtml(layer.n)}. ${escapeHtml(layer.title)}</div><div class="sub">${escapeHtml(assignment(build))}</div></div><div class="state" data-state="${escapeHtml(build.state || "planned")}">${percent}% · ${escapeHtml(stateLabel(build.state))}</div></div><div class="bar" aria-hidden="true"><span style="width:${percent}%"></span></div>${changes.map((line) => `<p class="delta">${escapeHtml(line)}</p>`).join("")}</article>`;
  }).join("");
  document.getElementById("checks").innerHTML = runs.length
    ? runs.map((run) => {
      const result = run.conclusion || run.status || "pending";
      const klass = result === "success" ? "ok" : result === "failure" ? "fail" : "";
      const when = agoLabel(run.at);
      const link = run.url ? `<a href="${escapeHtml(run.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(run.name)}</a>` : escapeHtml(run.name);
      return `<article class="run"><div class="row"><div>${link}<div class="sub">${escapeHtml(run.branch)} ${run.sha ? `· ${escapeHtml(run.sha)}` : ""}</div></div><div class="${klass}">${escapeHtml(result)}${when ? ` · ${escapeHtml(when)}` : ""}</div></div></article>`;
    }).join("")
    : "<p class=\"sub\">No public check runs yet.</p>";
  document.getElementById("commits").innerHTML = (feed.commits || []).map((commit) => {
    const layers = (commit.layers || []).map((n) => `layer ${n}`).join(", ");
    const pr = commit.pr ? ` · <a href="${escapeHtml(commit.prUrl || `https://github.com/${REPO}/pull/${commit.pr}`)}" target="_blank" rel="noopener noreferrer">View pull request ${commit.pr}</a>` : "";
    return `<article class="commit"><a href="${escapeHtml(commit.url || commitUrl(commit.sha))}" target="_blank" rel="noopener noreferrer">${escapeHtml(commit.title)}</a><div class="sub">${escapeHtml(agoLabel(commit.at))} · ${escapeHtml(commit.short || shortSha(commit.sha))}${commit.author ? ` · ${escapeHtml(commit.author)}` : ""}${layers ? ` · ${escapeHtml(layers)}` : ""}${pr}</div></article>`;
  }).join("") || "<p class=\"sub\">No diagram commits yet.</p>";
  document.getElementById("pulls").innerHTML = (feed.pulls || []).map((pull) => {
    const layers = (pull.layers || []).map((n) => `layer ${n}`).join(", ");
    const who = pull.user ? ` · ${pull.user}` : "";
    return `<article class="pull"><a href="${escapeHtml(pull.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(pull.title)}</a><div class="sub">${escapeHtml(pull.state)} · ${escapeHtml(agoLabel(pull.at))}${escapeHtml(who)}${layers ? ` · ${escapeHtml(layers)}` : ""}</div></article>`;
  }).join("") || "<p class=\"sub\">No diagram pull requests yet.</p>";
  const ago = readAt ? agoLabel(new Date(readAt).toISOString()) : "";
  text("stamp", ago ? `Read ${ago}. Refreshes every 5 minutes.` : "Waiting for the public repository.");
}

async function publishedFile() {
  const response = await fetch(new URL("../horbm.json", import.meta.url), { cache: "no-cache" });
  if (!response.ok) throw new Error(`Could not load horbm.json (${response.status}).`);
  published = await response.json();
}

async function bakedFeed() {
  try {
    const response = await fetch(new URL("../development.json", import.meta.url), { cache: "no-cache" });
    if (response.ok) feed = await response.json();
  } catch {
    feed = { commits: [], pulls: [] };
  }
}

async function github() {
  const [commitResponse, openResponse, runResponse] = await Promise.all([
    fetch(`https://api.github.com/repos/${REPO}/commits?path=v2/src/horbm/interactive/horbm.json&sha=master&per_page=8`, { headers: HEADERS }),
    fetch(`https://api.github.com/repos/${REPO}/pulls?state=open&sort=updated&direction=desc&per_page=20`, { headers: HEADERS }),
    fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=5`, { headers: HEADERS }),
  ]);
  const apiCommits = commitResponse.ok ? (await commitResponse.json()).map(normalizeApiCommit) : [];
  const known = new Set((feed.pulls || []).map((pull) => pull.number));
  const openItems = openResponse.ok ? await openResponse.json() : [];
  const interesting = openItems.filter((item) => known.has(item.number) || isDiagramPull(item)).slice(0, 3);
  const pulls = interesting.map(normalizePull);
  feed = mergeFeed(feed, apiCommits, pulls);
  if (runResponse.ok) {
    const body = await runResponse.json();
    runs = ((body && body.workflow_runs) || []).slice(0, 5).map(normalizeRun);
  }
  heads = [];
  for (const item of interesting) {
    const sha = item.head && item.head.sha;
    if (!sha) continue;
    const file = await fetch(
      `https://api.github.com/repos/${REPO}/contents/v2/src/horbm/interactive/horbm.json?ref=${sha}`,
      { headers: HEADERS },
    );
    if (!file.ok) continue;
    const body = await file.json();
    if (!body.content) continue;
    const bytes = Uint8Array.from(atob(String(body.content).replace(/\n/g, "")), (char) => char.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    heads.push({
      number: item.number,
      user: item.user && item.user.login,
      data,
    });
  }
}

let loading = false;
async function load() {
  if (loading) return;
  loading = true;
  try {
    await publishedFile();
    await bakedFeed();
    render();
    try {
      await github();
      readAt = Date.now();
    } catch {
      /* the baked progress and the last GitHub read stay */
    }
    render();
  } catch (error) {
    text("stamp", error.message || "Could not load progress.");
  } finally {
    loading = false;
  }
}

document.getElementById("refresh").addEventListener("click", () => {
  load();
});
load();
setInterval(load, REFRESH_MS);
setInterval(render, 30000);
