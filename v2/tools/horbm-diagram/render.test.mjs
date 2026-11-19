import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  diagramMarkdown,
  escapeHtml,
  layerPlainText,
  renderInner,
} from "../../src/horbm/interactive/diagram.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../src/horbm/interactive");
const shipped = JSON.parse(readFileSync(join(root, "horbm.json"), "utf8"));

function layers(data) {
  return data.bands.flatMap((band) => band.layers);
}

test("the shipped diagram renders its layers, paths, and footer", () => {
  const html = renderInner(shipped);
  for (const layer of layers(shipped)) {
    assert.ok(html.includes(`id="layer-${layer.n}"`), layer.n);
    assert.ok(html.includes(escapeHtml(layer.title)), layer.title);
  }
  let cursor = -1;
  shipped.down.forEach((step, index) => {
    const token = `data-side="down" data-step="${index + 1}"`;
    const at = html.indexOf(token);
    assert.ok(at > cursor, token);
    cursor = at;
    assert.ok(html.slice(at, at + 800).includes(escapeHtml(step.title)));
  });
  const top = html.indexOf(`data-side="up" data-step="${shipped.up.length}"`);
  const bottom = html.indexOf(`data-side="up" data-step="1"`);
  assert.ok(top !== -1 && bottom !== -1 && top < bottom);
  assert.ok(html.includes(`v${escapeHtml(shipped.version)}`));
  assert.ok(html.includes(escapeHtml(shipped.updatedLabel)));
  assert.ok(html.includes(escapeHtml(shipped.footer.credit)));
  assert.ok(html.includes(escapeHtml(shipped.footer.license)));
  assert.equal(html.includes("<script"), false);

  const guide = layers(shipped).find((layer) => layer.guide);
  const guideHtml = html.split(`id="layer-${guide.n}"`)[1].split('id="layer-')[0];
  assert.ok(guideHtml.includes(escapeHtml(guide.guideLabel)));

  for (const [index, step] of shipped.down.entries()) {
    const row = html.split(`id="layer-${step.layer}"`)[1].split('id="layer-')[0];
    assert.match(row, new RegExp(`↓ ${index + 1}`));
  }
});

test("markdown and layer text follow the JSON", () => {
  const markdown = diagramMarkdown(shipped);
  assert.match(markdown, new RegExp(`^# ${shipped.title}`));
  assert.ok(markdown.includes(shipped.footer.license));
  for (const layer of layers(shipped)) {
    assert.ok(markdown.includes(`${layer.n}. ${layer.title}`));
  }
  const text = layerPlainText(shipped, "1");
  assert.match(text, /^Layer 1\. /);
  assert.ok(text.includes("Down path"));
  assert.equal(layerPlainText(shipped, "missing"), "");
});

test("pills are derived and text is escaped", () => {
  const data = structuredClone(shipped);
  data.down = [
    {
      layer: "3",
      title: "Empathy",
      kind: "main",
      parts: [{ text: "Mood <point>", refs: "(23)", status: "A" }],
    },
  ];
  data.up = [
    {
      layer: "3",
      title: "Empathy",
      kind: "rec",
      parts: [{ text: 'Later "x"', refs: "(26)", status: "R" }],
    },
  ];
  data.after.items = [
    { layer: "3", text: "Write it down", refs: "(1)", status: "B" },
  ];
  data.bands = [
    {
      title: "Test",
      layers: [
        {
          n: "3",
          title: "Empathy",
          purpose: "Care",
          columns: 3,
          chips: [{ label: "Mood", ref: "(23)", sub: "3 numbers", status: "A" }],
        },
      ],
    },
  ];
  const html = renderInner(data);
  const row = html.split('id="layer-3"')[1];
  assert.match(row, /↓ 1/);
  assert.match(row, /↑ 1/);
  assert.match(row, /↑ after/);
  assert.match(html, /Mood &lt;point&gt;/);
  assert.match(html, /Later &quot;x&quot;/);
  assert.equal(html.includes("<point>"), false);
});
