import {
  diagramMarkdown,
  escapeHtml,
  layerPlainText,
  renderInner,
} from "./diagram.js";
import { MAX_SCALE, MIN_SCALE, fitPlacement } from "./fit.js";
import { commitUrl, historyUrl, shortSha } from "./github.js";
import { OVERALL_UNAVAILABLE, overallLabel } from "./progress.js";
const viewport = document.getElementById("viewport");
const world = document.getElementById("world");
const capture = document.getElementById("capture");
const zoomread = document.getElementById("zoomread");
const picked = document.getElementById("picked");
const status = document.getElementById("status");
const toastEl = document.getElementById("toast");

const state = { x: 0, y: 0, scale: 1 };
let data = null;
let query = "";
let pinned = null;
let hover = null;
let userMoved = false;
let toastTimer = 0;

const pointers = new Map();
let drag = null;
let pinch = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function apply() {
  world.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  zoomread.textContent = `${Math.round(state.scale * 100)}%`;
  scheduleMinimap();
}

function zoomAt(clientX, clientY, nextScale) {
  const rect = viewport.getBoundingClientRect();
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const worldX = (localX - state.x) / state.scale;
  const worldY = (localY - state.y) / state.scale;
  state.scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
  state.x = localX - worldX * state.scale;
  state.y = localY - worldY * state.scale;
  apply();
}

function zoomCenter(factor) {
  const rect = viewport.getBoundingClientRect();
  zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, state.scale * factor);
  userMoved = true;
}

let fitting = true;
let fitFrame = 0;
let fitMisses = 0;

function contentBox() {
  const width = capture.offsetWidth;
  const height = capture.offsetHeight;
  if (capture.querySelector(".lrow")) {
    if (width >= 1 && height >= 1) return { width, height };
    return { width: 2060, height: 2540 };
  }
  return null;
}

function measureWindow() {
  const width = window.innerWidth || 0;
  const height = window.innerHeight || 0;
  if (width < 64 || height < 64) return null;
  const toolbar = document.querySelector(".toolbar");
  const foot = document.querySelector(".pagefoot");
  const chromeH = (toolbar ? toolbar.offsetHeight : 0) + (foot ? foot.offsetHeight : 0);
  let chromeW = 0;
  const inspector = document.getElementById("inspector");
  const mobile = window.matchMedia("(max-width: 720px)").matches;
  if (inspector && !mobile && !inspector.classList.contains("is-closed")) {
    chromeW = inspector.getBoundingClientRect().width || 0;
  }
  return {
    width: Math.max(0, width - chromeW),
    height: Math.max(0, height - chromeH),
  };
}

function scheduleFit() {
  if (!fitting || userMoved || fitFrame) return;
  fitFrame = requestAnimationFrame(() => {
    fitFrame = 0;
    if (!userMoved) fit();
  });
}

function fit() {
  const content = contentBox();
  if (!content) {
    scheduleFit();
    return;
  }
  const view = { width: viewport.clientWidth, height: viewport.clientHeight };
  let place = fitPlacement(view.width, view.height, content.width, content.height);
  if (!place) {
    const fallback = measureWindow();
    if (fallback) place = fitPlacement(fallback.width, fallback.height, content.width, content.height);
  }
  if (!place) {
    if (fitMisses < 60) {
      fitMisses += 1;
      scheduleFit();
    }
    return;
  }
  fitMisses = 0;
  state.scale = place.scale;
  state.x = place.x;
  state.y = place.y;
  userMoved = false;
  apply();
}

function reset() {
  const width = capture.offsetWidth || 2060;
  state.scale = 1;
  state.x = (viewport.clientWidth - width) / 2;
  state.y = 16;
  userMoved = true;
  apply();
}

function layerIdFrom(target) {
  const node = target && target.closest ? target.closest("[data-layer]") : null;
  return node ? node.dataset.layer : null;
}

function hashLayer() {
  const match = location.hash.match(/^#layer-(\d+)$/);
  return match ? match[1] : null;
}

function knownLayer(id) {
  if (!data || id == null) return false;
  return data.bands.some((band) => band.layers.some((layer) => layer.n === id));
}

function layerRecord(id) {
  for (const band of data.bands) {
    const found = band.layers.find((layer) => layer.n === id);
    if (found) return found;
  }
  return null;
}

function applyHot(id) {
  world.classList.toggle("has-hot", Boolean(id));
  for (const node of capture.querySelectorAll(".is-hot")) node.classList.remove("is-hot");
  for (const node of capture.querySelectorAll("[aria-pressed]")) {
    node.setAttribute("aria-pressed", "false");
  }
  if (!id) return;
  const selector = `[data-layer="${CSS.escape(id)}"]`;
  for (const node of capture.querySelectorAll(selector)) node.classList.add("is-hot");
  const row = document.getElementById(`layer-${id}`);
  if (row) row.setAttribute("aria-pressed", "true");
  scheduleMinimap();
}

function updatePicked() {
  const id = pinned;
  const copyLayer = document.getElementById("copy-layer");
  const copyLink = document.getElementById("copy-link");
  if (!id) {
    picked.textContent = "Select a layer to copy it or share it.";
    copyLayer.disabled = true;
    copyLink.disabled = true;
    renderInspector();
    applyFind();
    return;
  }
  const layer = layerRecord(id);
  picked.textContent = layer
    ? `Layer ${layer.n} · ${layer.title}`
    : `Layer ${id}`;
  copyLayer.disabled = false;
  copyLink.disabled = false;
  renderInspector();
  applyFind();
}

function showHot() {
  applyHot(hover || pinned);
}

function setPinned(id, { pan, replaceHash }) {
  if (!knownLayer(id)) return;
  pinned = id;
  hover = null;
  showHot();
  updatePicked();
  if (replaceHash) {
    const next = `#layer-${id}`;
    if (location.hash !== next) history.replaceState(null, "", next);
  }
  if (pan) frameLayer(document.getElementById(`layer-${id}`));
}

function clearPinned() {
  pinned = null;
  hover = null;
  showHot();
  updatePicked();
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}

function frameLayer(el) {
  if (!el) return;
  const card = el.querySelector(".card") || el;
  const layoutWidth = card.offsetWidth || 600;
  const target = clamp((viewport.clientWidth * 0.9) / layoutWidth, state.scale, 1.5);
  const before = card.getBoundingClientRect();
  zoomAt(before.left + before.width / 2, before.top + before.height / 2, target);
  const after = card.getBoundingClientRect();
  const vp = viewport.getBoundingClientRect();
  state.x += vp.left + vp.width / 2 - (after.left + after.width / 2);
  state.y += vp.top + vp.height / 2 - (after.top + after.height / 2);
  userMoved = true;
  apply();
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  status.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
}

async function copyText(text, message) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      if (!ok) throw new Error("copy failed");
    }
    toast(message);
  } catch {
    toast("Could not copy");
  }
}

function shareUrl(id) {
  const url = new URL(location.href);
  url.hash = `layer-${id}`;
  return url.toString();
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

let exportCssPromise;
function exportCss() {
  if (!exportCssPromise) {
    exportCssPromise = (async () => {
      const base = import.meta.url;
      const diagramCss = await (await fetch(new URL("diagram.css", base))).text();
      const viewerCss = await (await fetch(new URL("viewer.css", base))).text();
      const font = await (await fetch(new URL("fonts/HORBMSans-Variable.woff2", base))).arrayBuffer();
      const encoded = bytesToBase64(new Uint8Array(font));
      const inlined = diagramCss.replace(
        'url("fonts/HORBMSans-Variable.woff2") format("woff2")',
        `url("data:font/woff2;base64,${encoded}") format("woff2")`
      );
      return `${inlined}\n${viewerCss}`;
    })();
  }
  return exportCssPromise;
}

async function viewSvg() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  const css = await exportCss();
  const safeCss = css.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<foreignObject x="0" y="0" width="${width}" height="${height}">
<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;background:#01080f;position:relative;font-family:'HORBM Sans',sans-serif;color:#E6F1FB">
<style>${safeCss}</style>
${world.outerHTML}
</div>
</foreignObject>
</svg>`;
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function downloadSvg() {
  const svg = await viewSvg();
  saveBlob(new Blob([svg], { type: "image/svg+xml" }), "horbm-view.svg");
  toast("Downloaded SVG");
}

function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL("html2canvas.min.js", import.meta.url).href;
    script.onload = () => resolve(window.html2canvas);
    script.onerror = () => reject(new Error("Could not load the PNG exporter"));
    document.head.appendChild(script);
  });
}

async function downloadPng() {
  try {
    const html2canvas = await loadHtml2Canvas();
    const canvas = await html2canvas(viewport, {
      backgroundColor: "#01080f",
      scale: Math.min(2, window.devicePixelRatio || 1),
      logging: false,
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not build the PNG");
    saveBlob(blob, "horbm-view.png");
    toast("Downloaded PNG");
  } catch (error) {
    toast(error.message || "Could not build the PNG");
  }
}

function onKey(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const tag = event.target && event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (event.key === "+" || event.key === "=") {
    event.preventDefault();
    zoomCenter(1.15);
  } else if (event.key === "-" || event.key === "_") {
    event.preventDefault();
    zoomCenter(1 / 1.15);
  } else if (event.key === "0") {
    event.preventDefault();
    reset();
  } else if (event.key === "f" || event.key === "F") {
    event.preventDefault();
    fit();
  } else if (event.key === "Escape") {
    clearPinned();
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveLayer(event.key === "ArrowDown" ? 1 : -1);
  } else if ((event.key === "Enter" || event.key === " ") && layerIdFrom(event.target)) {
    event.preventDefault();
    setPinned(layerIdFrom(event.target), { pan: false, replaceHash: true });
  }
}

viewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  let delta = event.deltaY;
  if (event.deltaMode === 1) delta *= 16;
  if (event.deltaMode === 2) delta *= viewport.clientHeight;
  zoomAt(event.clientX, event.clientY, state.scale * Math.exp(-delta * 0.0016));
  userMoved = true;
}, { passive: false });

viewport.addEventListener("pointerdown", (event) => {
  if (event.button != null && event.button !== 0) return;
  viewport.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 1) {
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: state.x,
      originY: state.y,
      moved: false,
      target: event.target,
    };
    pinch = null;
  } else if (pointers.size === 2) {
    const now = pinchPoints();
    pinch = { ...now, scale: state.scale, x: state.x, y: state.y };
    drag = null;
    viewport.classList.add("is-panning");
  }
});

function pinchPoints() {
  const points = [...pointers.values()];
  const dx = points[0].x - points[1].x;
  const dy = points[0].y - points[1].y;
  return {
    dist: Math.max(1, Math.hypot(dx, dy)),
    cx: (points[0].x + points[1].x) / 2,
    cy: (points[0].y + points[1].y) / 2,
  };
}

viewport.addEventListener("pointermove", (event) => {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size >= 2 && pinch) {
    const now = pinchPoints();
    const rect = viewport.getBoundingClientRect();
    const localX = pinch.cx - rect.left;
    const localY = pinch.cy - rect.top;
    const worldX = (localX - pinch.x) / pinch.scale;
    const worldY = (localY - pinch.y) / pinch.scale;
    state.scale = clamp(pinch.scale * (now.dist / pinch.dist), MIN_SCALE, MAX_SCALE);
    state.x = now.cx - rect.left - worldX * state.scale;
    state.y = now.cy - rect.top - worldY * state.scale;
    userMoved = true;
    apply();
    return;
  }
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 5) return;
  drag.moved = true;
  viewport.classList.add("is-panning");
  state.x = drag.originX + dx;
  state.y = drag.originY + dy;
  userMoved = true;
  apply();
});

function endPointer(event) {
  const wasDrag = drag && drag.id === event.pointerId ? drag : null;
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinch = null;
  if (wasDrag && !wasDrag.moved && pointers.size === 0) {
    const id = layerIdFrom(wasDrag.target);
    if (id) setPinned(id, { pan: false, replaceHash: true });
    else clearPinned();
  }
  if (!pointers.size) {
    drag = null;
    viewport.classList.remove("is-panning");
  }
}

viewport.addEventListener("pointerup", endPointer);
viewport.addEventListener("pointercancel", endPointer);

capture.addEventListener("pointerover", (event) => {
  const id = layerIdFrom(event.target);
  if (!id || id === hover) return;
  hover = id;
  showHot();
});

capture.addEventListener("pointerout", (event) => {
  if (!hover) return;
  const next = event.relatedTarget && layerIdFrom(event.relatedTarget);
  if (next === hover) return;
  hover = null;
  showHot();
});

document.getElementById("zoom-in").addEventListener("click", () => zoomCenter(1.15));
document.getElementById("zoom-out").addEventListener("click", () => zoomCenter(1 / 1.15));
document.getElementById("fit").addEventListener("click", () => fit());
document.getElementById("reset").addEventListener("click", () => reset());
document.getElementById("copy-layer").addEventListener("click", () => {
  if (!pinned) return;
  copyText(layerPlainText(data, pinned), `Copied layer ${pinned}`);
});
document.getElementById("copy-link").addEventListener("click", () => {
  if (!pinned) return;
  copyText(shareUrl(pinned), `Copied link to layer ${pinned}`);
});
document.getElementById("copy-md").addEventListener("click", () => {
  copyText(diagramMarkdown(data), "Copied the diagram as Markdown");
});
document.getElementById("save-png").addEventListener("click", () => {
  downloadPng();
});
document.getElementById("save-svg").addEventListener("click", () => {
  downloadSvg();
});
document.getElementById("layers-toggle").addEventListener("click", () => toggleInspector());
document.getElementById("inspector-close").addEventListener("click", () => toggleInspector(false));
document.getElementById("find").addEventListener("input", (event) => {
  query = event.target.value;
  updatePicked();
});
document.getElementById("find").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const hit = layersFlat().find((item) => matchesQuery(item.layer));
  if (!hit) return;
  event.preventDefault();
  setPinned(hit.layer.n, { pan: true, replaceHash: true });
});
document.getElementById("minimap").addEventListener("pointerdown", (event) => {
  const canvas = document.getElementById("minimap-canvas");
  const rect = canvas.getBoundingClientRect();
  const worldW = world.offsetWidth || 1;
  const worldH = world.offsetHeight || 1;
  const scale = Math.min(canvas.width / worldW, canvas.height / worldH);
  const wx = ((event.clientX - rect.left) * (canvas.width / rect.width)) / scale;
  const wy = ((event.clientY - rect.top) * (canvas.height / rect.height)) / scale;
  state.x = viewport.clientWidth / 2 - wx * state.scale;
  state.y = viewport.clientHeight / 2 - wy * state.scale;
  userMoved = true;
  apply();
});
window.addEventListener("keydown", onKey);
window.addEventListener("resize", () => {
  if (!userMoved) fit();
});
if (typeof ResizeObserver === "function") {
  const observer = new ResizeObserver(() => {
    if (!userMoved) fit();
  });
  observer.observe(viewport);
}
window.addEventListener("hashchange", () => {
  const id = hashLayer();
  if (id && knownLayer(id)) setPinned(id, { pan: true, replaceHash: false });
  else if (!id) clearPinned();
});

function layersFlat() {
  const list = [];
  for (const band of data.bands) {
    for (const layer of band.layers) list.push({ band: band.title, layer });
  }
  return list.sort((a, b) => Number(a.layer.n) - Number(b.layer.n));
}

function matchesQuery(layer) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return true;
  const hay = [
    layer.n,
    layer.title,
    layer.purpose,
    ...(layer.chips || []).map((chip) => `${chip.label} ${chip.sub}`),
  ].join(" ").toLowerCase();
  return hay.includes(needle);
}

function statusSummary(layer) {
  const labels = [];
  for (const chip of layer.chips || []) {
    const label = data.statuses[chip.status] && data.statuses[chip.status].label;
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels.join(" · ");
}

function rowHtml(item) {
  return `<div class="layer-item"><button type="button" data-pick="${escapeHtml(item.layer.n)}"><b>${escapeHtml(item.layer.n)}. ${escapeHtml(item.layer.title)}</b><span class="meta">${escapeHtml(item.band)}</span></button></div>`;
}

function detailHtml(layer) {
  const chips = (layer.chips || []).map((chip) => {
    const label = data.statuses[chip.status] ? data.statuses[chip.status].label : chip.status;
    return `<li><b>${escapeHtml(chip.label)}</b> ${escapeHtml(chip.ref)}<span class="meta">${escapeHtml(label)}</span><p>${escapeHtml(chip.sub)}</p></li>`;
  }).join("");
  return `<div class="layer-detail"><h2>${escapeHtml(layer.n)}. ${escapeHtml(layer.title)}</h2><p>${escapeHtml(layer.purpose)}</p><p class="meta">${escapeHtml(statusSummary(layer))}</p><ul class="chip-list">${chips}</ul></div>`;
}

function renderInspector() {
  if (!data) return;
  const body = document.getElementById("inspector-body");
  const heading = document.getElementById("inspector-heading");
  const parts = [];
  const current = pinned ? layerRecord(pinned) : null;
  heading.textContent = current ? `Layer ${current.n}` : "Layers";
  if (current) parts.push(detailHtml(current));
  const items = layersFlat().filter((item) => matchesQuery(item.layer) && item.layer.n !== pinned);
  if (query.trim().length >= 2 && !items.length && !current) parts.push("<p>No layer matches.</p>");
  for (const item of items) parts.push(rowHtml(item));
  body.innerHTML = parts.join("");
  for (const button of body.querySelectorAll("[data-pick]")) {
    button.addEventListener("click", () => {
      setPinned(button.dataset.pick, { pan: true, replaceHash: true });
    });
  }
}

function applyFind() {
  if (!data) return;
  const needle = query.trim().toLowerCase();
  for (const row of capture.querySelectorAll(".lrow")) {
    const layer = layerRecord(row.dataset.layer);
    row.classList.toggle("is-find", Boolean(layer) && needle.length >= 2 && matchesQuery(layer));
  }
}

function showCommit(sha) {
  const link = document.getElementById("sha-link");
  const short = shortSha(sha);
  if (!short) return;
  link.href = commitUrl(sha);
  link.textContent = short;
}

function showOverall(label) {
  const node = document.getElementById("overall");
  if (node) node.textContent = label;
}

async function loadCommit() {
  const history = document.getElementById("history-link");
  history.href = historyUrl();
  try {
    const response = await fetch(new URL("build.json", import.meta.url), { cache: "no-cache" });
    if (response.ok) {
      const baked = await response.json();
      if (baked && baked.sha) showCommit(baked.sha);
    }
  } catch {
    /* the public commit lookup below still runs */
  }
  try {
    const response = await fetch(
      "https://api.github.com/repos/galion-studio/galion-knowledge/commits?path=v2/src/horbm/interactive/horbm.json&sha=master&per_page=1",
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!response.ok) return;
    const commits = await response.json();
    const sha = commits && commits[0] && commits[0].sha;
    if (sha) showCommit(sha);
  } catch {
    /* the baked commit stays */
  }
}

function moveLayer(step) {
  const ids = layersFlat().map((item) => item.layer.n);
  if (!ids.length) return;
  const at = ids.indexOf(pinned);
  const next = ids[(Math.max(0, at) + step + ids.length) % ids.length];
  setPinned(next, { pan: true, replaceHash: true });
}

function inspectorIsOpen() {
  const node = document.getElementById("inspector");
  const mobile = window.matchMedia("(max-width: 720px)").matches;
  return mobile ? node.classList.contains("is-open") : !node.classList.contains("is-closed");
}

function toggleInspector(force) {
  const node = document.getElementById("inspector");
  const mobile = window.matchMedia("(max-width: 720px)").matches;
  const open = force == null ? !inspectorIsOpen() : force;
  node.classList.toggle("is-open", mobile && open);
  node.classList.toggle("is-closed", !mobile && !open);
  document.getElementById("layers-toggle").setAttribute("aria-expanded", open ? "true" : "false");
  if (!userMoved) fit();
}

let mapFrame = 0;
function scheduleMinimap() {
  if (mapFrame) return;
  mapFrame = requestAnimationFrame(() => {
    mapFrame = 0;
    drawMinimap();
  });
}

function drawMinimap() {
  const canvas = document.getElementById("minimap-canvas");
  if (!canvas || !capture.querySelector(".lrow")) return;
  const ctx = canvas.getContext("2d");
  const worldW = world.offsetWidth || 1;
  const worldH = world.offsetHeight || 1;
  const scale = Math.min(canvas.width / worldW, canvas.height / worldH);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#01080f";
  ctx.fillRect(0, 0, worldW * scale, worldH * scale);
  const origin = world.getBoundingClientRect();
  for (const node of capture.querySelectorAll(".lrow, .step")) {
    const rect = node.getBoundingClientRect();
    ctx.fillStyle = node.classList.contains("is-hot") ? "#58c4ff" : "#1f4670";
    ctx.fillRect(
      ((rect.left - origin.left) / state.scale) * scale,
      ((rect.top - origin.top) / state.scale) * scale,
      Math.max(1, (rect.width / state.scale) * scale),
      Math.max(1, (rect.height / state.scale) * scale),
    );
  }
  ctx.strokeStyle = "#f2a93b";
  ctx.lineWidth = 1;
  ctx.strokeRect(
    (-state.x / state.scale) * scale,
    (-state.y / state.scale) * scale,
    (viewport.clientWidth / state.scale) * scale,
    (viewport.clientHeight / state.scale) * scale,
  );
}

function fail(message) {
  fitting = false;
  capture.className = "";
  capture.innerHTML = `<p class="load-error">${escapeHtml(message)}</p>`;
}

async function start() {
  fitting = true;
  try {
    const response = await fetch(new URL("horbm.json", import.meta.url), { cache: "no-cache" });
    if (!response.ok) throw new Error(`Could not load horbm.json (${response.status}).`);
    const jsonText = await response.text();
    const loaded = JSON.parse(jsonText);
    if (!loaded || !Array.isArray(loaded.bands) || !Array.isArray(loaded.down)) {
      throw new Error("horbm.json is missing the layers.");
    }
    data = loaded;
    showOverall(overallLabel(data));
    capture.className = "wrap";
    capture.innerHTML = renderInner(data);
    document.title = data.title || document.title;
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch { /* draw with the fallback face */ }
    }
    fit();
    updatePicked();
    loadCommit();
    const id = hashLayer();
    if (id && knownLayer(id)) setPinned(id, { pan: true, replaceHash: false });
  } catch (error) {
    if (!data) showOverall(OVERALL_UNAVAILABLE);
    fail(error.message || "Could not draw the diagram.");
  }
}

start();
