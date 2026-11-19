import {
  diagramMarkdown,
  escapeHtml,
  layerPlainText,
  renderInner,
} from "./diagram.js";

const MIN_SCALE = 0.05;
const MAX_SCALE = 4;
const viewport = document.getElementById("viewport");
const world = document.getElementById("world");
const capture = document.getElementById("capture");
const zoomread = document.getElementById("zoomread");
const picked = document.getElementById("picked");
const status = document.getElementById("status");
const toastEl = document.getElementById("toast");

const state = { x: 0, y: 0, scale: 1 };
let data = null;
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

function fit() {
  const pad = 24;
  const width = capture.offsetWidth || 2060;
  const height = capture.offsetHeight || 2540;
  const scale = Math.min(
    (viewport.clientWidth - pad) / width,
    (viewport.clientHeight - pad) / height
  );
  state.scale = clamp(scale, MIN_SCALE, MAX_SCALE);
  state.x = (viewport.clientWidth - width * state.scale) / 2;
  state.y = (viewport.clientHeight - height * state.scale) / 2;
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
}

function updatePicked() {
  const id = pinned;
  const copyLayer = document.getElementById("copy-layer");
  const copyLink = document.getElementById("copy-link");
  if (!id) {
    picked.textContent = "Select a layer to copy it or share it.";
    copyLayer.disabled = true;
    copyLink.disabled = true;
    return;
  }
  const layer = layerRecord(id);
  picked.textContent = layer
    ? `Layer ${layer.n} · ${layer.title}`
    : `Layer ${id}`;
  copyLayer.disabled = false;
  copyLink.disabled = false;
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
window.addEventListener("keydown", onKey);
window.addEventListener("resize", () => {
  if (!userMoved) fit();
});
window.addEventListener("hashchange", () => {
  const id = hashLayer();
  if (id && knownLayer(id)) setPinned(id, { pan: true, replaceHash: false });
  else if (!id) clearPinned();
});

function fail(message) {
  capture.className = "";
  capture.innerHTML = `<p class="load-error">${escapeHtml(message)}</p>`;
}

async function start() {
  try {
    const response = await fetch(new URL("horbm.json", import.meta.url), { cache: "no-cache" });
    if (!response.ok) throw new Error(`Could not load horbm.json (${response.status}).`);
    data = await response.json();
    if (!data || !Array.isArray(data.bands) || !Array.isArray(data.down)) {
      throw new Error("horbm.json is missing the layers.");
    }
    capture.className = "wrap";
    capture.innerHTML = renderInner(data);
    document.title = data.title;
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    fit();
    const id = hashLayer();
    if (id && knownLayer(id)) setPinned(id, { pan: true, replaceHash: false });
  } catch (error) {
    fail(error.message || "Could not draw the diagram.");
  }
}

start();
