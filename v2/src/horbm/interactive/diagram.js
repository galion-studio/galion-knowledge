// Renders horbm.json. Wording, status, and connections live in that file.

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layersOf(data) {
  const layers = [];
  for (const band of data.bands) layers.push(...band.layers);
  return layers;
}

function statusLabel(data, status, where) {
  const entry = data.statuses && data.statuses[status];
  if (!entry) throw new Error(`${where} uses unknown status "${status}"`);
  return entry.label;
}

function kindLabel(data, kind, where) {
  const entry = data.kinds && data.kinds[kind];
  if (!entry) throw new Error(`${where} uses unknown kind "${kind}"`);
  return entry.label;
}

function connections(data) {
  const down = new Map();
  const up = new Map();
  data.down.forEach((step, index) => {
    const list = down.get(step.layer) || [];
    list.push({ step: index + 1, kind: step.kind });
    down.set(step.layer, list);
  });
  data.up.forEach((step, index) => {
    const list = up.get(step.layer) || [];
    list.push({ step: index + 1, kind: step.kind });
    up.set(step.layer, list);
  });
  for (const item of data.after.items) {
    const list = up.get(item.layer) || [];
    list.push({ step: "after", kind: "main" });
    up.set(item.layer, list);
  }
  return { down, up };
}

function pillsFor(layer, links) {
  if (layer.guide) {
    const label = layer.guideLabel || "guide, not a step";
    return `<div class="lpills"><span class="lpill lp-g">${escapeHtml(label)}</span></div>`;
  }
  let html = "";
  for (const item of links.down.get(layer.n) || []) {
    html += `<span class="lpill lp-d lk-${escapeHtml(item.kind)}">↓ ${item.step}</span>`;
  }
  const seen = new Set();
  for (const item of links.up.get(layer.n) || []) {
    if (seen.has(item.step)) continue;
    seen.add(item.step);
    const kind = escapeHtml(item.kind);
    html += `<span class="lpill lp-u lk-${kind}">↑ ${item.step}</span>`;
  }
  return `<div class="lpills">${html}</div>`;
}

function renderLegendItem(item) {
  if (item.note) return `<div class="legnote">${escapeHtml(item.note)}</div>`;
  if (item.swatch === "pills") {
    return `<div class="legrow"><span class="lpill lp-d" style="font-size:10px">↓ ${escapeHtml(item.down)}</span><span class="lpill lp-u" style="font-size:10px">↑ ${escapeHtml(item.up)}</span>${escapeHtml(item.label)}</div>`;
  }
  return `<div class="legrow"><span class="sw sw-${escapeHtml(item.swatch)}"></span>${escapeHtml(item.label)}</div>`;
}

function renderPart(data, part, where, badgeLayer) {
  const label = statusLabel(data, part.status, where);
  const text = badgeLayer
    ? `<b class="al">${escapeHtml(badgeLayer)}</b> ${escapeHtml(part.text)}`
    : escapeHtml(part.text);
  const attrs = badgeLayer
    ? ` data-layer="${escapeHtml(badgeLayer)}" data-side="after"`
    : "";
  return `<div class="pt pt-${escapeHtml(part.status)}"${attrs}><div class="ptx">${text}</div><div class="ptr"><span class="pref">${escapeHtml(part.refs)}</span><span class="ptag">${escapeHtml(label)}</span></div></div>`;
}

function renderStep(data, step, number, side) {
  const where = `${side} step ${number}`;
  const klabel = kindLabel(data, step.kind, where);
  const kclass = { rec: "r", cond: "c", skip: "s" }[step.kind];
  const ktag = klabel ? `<span class="ktag ktag-${kclass}">${escapeHtml(klabel)}</span>` : "";
  const tagline = step.tagline ? `<div class="stl">${escapeHtml(step.tagline)}</div>` : "";
  const body =
    step.kind === "skip"
      ? `<div class="skn">${escapeHtml(step.note || "")}</div>`
      : (step.parts || [])
          .map((part) => renderPart(data, part, where, null))
          .join("");
  return `<div class="step sk-${escapeHtml(step.kind)}" data-layer="${escapeHtml(step.layer)}" data-side="${side}" data-step="${number}"><div class="sbadge"><span class="sn">${number}</span></div><div class="sc"><div class="sh"><span class="sl">${escapeHtml(step.layer)}</span><span class="stt">${escapeHtml(step.title)}</span>${ktag}</div>${tagline}${body}</div></div>`;
}

function renderPath(data, steps, side) {
  const ordered = side === "up" ? [...steps].map((_, index) => steps[steps.length - 1 - index]) : steps;
  const html = [];
  ordered.forEach((step, index) => {
    const number = side === "up" ? steps.length - index : index + 1;
    if (index) html.push(`<div class="gap"></div>`);
    html.push(renderStep(data, step, number, side));
  });
  return html.join("");
}

function renderChip(data, chip, where) {
  const label = statusLabel(data, chip.status, where);
  return `<div class="chip st-${escapeHtml(String(chip.status).toLowerCase())}"><div class="bt"><span class="lab">${escapeHtml(chip.label)}</span><span class="ref">${escapeHtml(chip.ref)}</span></div><div class="sub">${escapeHtml(chip.sub)}</div><div class="tag">${escapeHtml(label)}</div></div>`;
}

function renderLayer(data, layer, links) {
  const columns = Number(layer.columns);
  let chipsClass = "chips";
  let style = "";
  if (columns === 4) chipsClass = "chips n4";
  else if (columns === 3) chipsClass = "chips n6";
  else if (columns > 0) style = ` style="grid-template-columns:repeat(${columns},1fr)"`;
  const chips = layer.chips
    .map((chip) => renderChip(data, chip, `layer ${layer.n}`))
    .join("");
  const label = `Layer ${layer.n}. ${layer.title}. ${layer.purpose}`;
  return `<div class="lrow" id="layer-${escapeHtml(layer.n)}" data-layer="${escapeHtml(layer.n)}" data-side="center" tabindex="0" role="button" aria-pressed="false" aria-label="${escapeHtml(label)}"><div class="spine"><div class="spn"></div><div class="ln">${escapeHtml(layer.n)}</div><div class="spn"></div></div><div class="card"><div class="head"><div class="lt">${escapeHtml(layer.title)}</div><div class="lp">${escapeHtml(layer.purpose)}</div>${pillsFor(layer, links)}</div><div class="${chipsClass}"${style}>${chips}</div></div></div>`;
}

function renderBand(data, band, links) {
  const rows = [];
  band.layers.forEach((layer, index) => {
    rows.push(renderLayer(data, layer, links));
    if (index !== band.layers.length - 1) {
      rows.push(`<div class="conn"><div class="cdot"></div><div></div></div>`);
    }
  });
  return `<div class="band"><div class="bandh">${escapeHtml(band.title)}</div>${rows.join("")}</div>`;
}

function sideHead(block) {
  return `<div class="sidehd"><div class="k">${escapeHtml(block.kicker)}</div><div class="h">${escapeHtml(block.title)}</div><div class="d">${escapeHtml(block.detail)}</div></div>`;
}

export function renderInner(data) {
  const links = connections(data);
  const legend = data.legend.map(renderLegendItem).join("");
  const bands = data.bands.map((band) => renderBand(data, band, links)).join("");
  const after = data.after.items
    .map((item) => renderPart(data, item, "after", item.layer))
    .join("");
  return `<div class="hd"><div><div class="kick">${escapeHtml(data.kicker)}</div><h1>${escapeHtml(data.title)}</h1><div class="h2">${escapeHtml(data.subtitle)}</div><p class="lead">${escapeHtml(data.lead)}</p></div><div class="legend">${legend}</div></div><div class="tw"><div class="side down">${sideHead(data.input)}<div class="guide"><b>${escapeHtml(data.guide.title)}</b> ${escapeHtml(data.guide.text)}</div><div class="path"><div class="shaftv"></div><div class="ahead"></div>${renderPath(data, data.down, "down")}</div></div><div class="center"><div class="bands">${bands}</div></div><div class="side up"><div class="afterbox"><div class="k">${escapeHtml(data.after.kicker)}</div><div class="d">${escapeHtml(data.after.detail)}</div>${after}</div>${sideHead(data.output)}<div class="path"><div class="shaftv"></div><div class="ahead"></div>${renderPath(data, data.up, "up")}</div></div></div><div class="foot"><div>${escapeHtml(data.footer.sources)}</div><div><b>${escapeHtml(data.footer.credit)}</b> · ${escapeHtml(data.footer.license)} · v${escapeHtml(data.version)} · updated <time datetime="${escapeHtml(data.updated)}">${escapeHtml(data.updatedLabel)}</time></div></div>`;
}

export function renderDiagram(data) {
  return `<div class="wrap" id="capture">${renderInner(data)}</div>`;
}

export function renderDocument(data, cssHref) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(data.title)}</title>
<link rel="stylesheet" href="${escapeHtml(cssHref)}">
</head>
<body>
${renderDiagram(data)}
</body>
</html>
`;
}

function hotSummary(steps) {
  const items = steps.filter((step) => step.kind !== "skip");
  const bits = [];
  for (let index = 0; index < items.length; index += 1) {
    const step = items[index];
    const next = items[index + 1];
    if (next && step.tagline && step.tagline.includes(`layer ${next.layer}`)) {
      let label = `${step.layer}+${next.layer}`;
      if (next.kind === "cond") label += " (if needed)";
      bits.push(label);
      index += 1;
      continue;
    }
    bits.push(step.kind === "cond" ? `${step.layer} (if needed)` : step.layer);
  }
  return bits.join(" > ");
}

function stepPlain(data, step, number) {
  const kind = kindLabel(data, step.kind, step.title);
  const lines = [
    `${number}. Layer ${step.layer}. ${step.title}${kind ? ` (${kind})` : ""}`,
  ];
  if (step.tagline) lines.push(`   ${step.tagline}`);
  if (step.kind === "skip") {
    lines.push(`   ${step.note || ""}`);
    return lines;
  }
  for (const part of step.parts || []) {
    const label = statusLabel(data, part.status, step.title);
    lines.push(`   - ${part.text} ${part.refs} — ${label}`);
  }
  return lines;
}

export function layerPlainText(data, n) {
  const id = String(n).replace(/^#?layer-/, "");
  const layer = layersOf(data).find((item) => item.n === id);
  if (!layer) return "";
  const lines = [`Layer ${layer.n}. ${layer.title}`, layer.purpose, ""];
  if (layer.guide) lines.push(layer.guideLabel || "guide, not a step", "");
  lines.push("Parts");
  for (const chip of layer.chips) {
    const label = statusLabel(data, chip.status, layer.title);
    lines.push(`- ${chip.label} ${chip.ref} — ${label}. ${chip.sub}`);
  }
  const down = data.down
    .map((step, index) => ({ step, number: index + 1 }))
    .filter((item) => item.step.layer === id);
  const up = data.up
    .map((step, index) => ({ step, number: index + 1 }))
    .filter((item) => item.step.layer === id);
  const after = data.after.items.filter((item) => item.layer === id);
  if (down.length) {
    lines.push("", "Down path");
    for (const item of down) lines.push(...stepPlain(data, item.step, item.number));
  }
  if (up.length) {
    lines.push("", "Up path");
    for (const item of up) lines.push(...stepPlain(data, item.step, item.number));
  }
  if (after.length) {
    lines.push("", "After it speaks");
    for (const item of after) {
      const label = statusLabel(data, item.status, "after");
      lines.push(`- ${item.text} ${item.refs} — ${label}`);
    }
  }
  return `${lines.join("\n").trim()}\n`;
}

export function diagramMarkdown(data) {
  const lines = [
    `# ${data.title}`,
    "",
    data.subtitle,
    "",
    data.lead,
    "",
    `Version ${data.version}. Updated ${data.updatedLabel}.`,
    "",
    `Down path: ${hotSummary(data.down)}`,
    `Up path: ${hotSummary(data.up)} > output`,
    "",
    "## Down",
    "",
  ];
  data.down.forEach((step, index) => {
    lines.push(...stepPlain(data, step, index + 1), "");
  });
  lines.push("## Up", "");
  data.up.forEach((step, index) => {
    lines.push(...stepPlain(data, step, index + 1), "");
  });
  lines.push(`## ${data.after.kicker}`, "", data.after.detail, "");
  for (const item of data.after.items) {
    const label = statusLabel(data, item.status, "after");
    lines.push(`- **${item.layer}** ${item.text} ${item.refs} — ${label}`);
  }
  lines.push("", "## Layers", "");
  for (const layer of layersOf(data)) {
    lines.push(`### ${layer.n}. ${layer.title}`, "", layer.purpose, "");
    if (layer.guide) lines.push(layer.guideLabel || "guide, not a step", "");
    for (const chip of layer.chips) {
      const label = statusLabel(data, chip.status, layer.title);
      lines.push(`- **${chip.label}** ${chip.ref} — ${label}. ${chip.sub}`);
    }
    lines.push("");
  }
  lines.push("---", "", `${data.footer.credit}. ${data.footer.license}.`, data.footer.sources, "");
  return lines.join("\n");
}
