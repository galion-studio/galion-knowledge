// Draws v2/src/horbm/horbm-layers-twoway.png from horbm.json.
// Same canvas as v2/src/horbm/source/render.js: 2060 CSS pixels wide, device scale 2.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

import { renderDocument } from "../../src/horbm/interactive/diagram.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const interactive = path.resolve(here, "../../src/horbm/interactive");
const defaultOut = path.resolve(here, "../../src/horbm/horbm-layers-twoway.png");

async function waitForJson(port) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/json/version`);
      if (response.ok) return await response.json();
    } catch {
      /* chrome is still starting */
    }
    await delay(100);
  }
  throw new Error("Chrome did not open a debugging port.");
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.next = 0;
    this.pending = new Map();
    this.waiters = new Map();
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
      if (msg.id) {
        const pending = this.pending.get(msg.id);
        if (!pending) return;
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else pending.resolve(msg.result || {});
      } else if (msg.method) {
        const queue = this.waiters.get(msg.method);
        if (queue && queue.length) queue.shift()(msg.params || {});
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.next;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const queue = this.waiters.get(method) || [];
      queue.push(resolve);
      this.waiters.set(method, queue);
    });
  }
}

const outPath = path.resolve(process.argv[2] || defaultOut);
const data = JSON.parse(readFileSync(path.join(interactive, "horbm.json"), "utf8"));
const cssHref = `file://${path.join(interactive, "diagram.css")}`;
const htmlPath = path.join(interactive, ".horbm-render.html");
writeFileSync(htmlPath, renderDocument(data, cssHref));

const userDir = mkdtempSync(path.join(tmpdir(), "horbm-chrome-"));
const port = 9400 + Math.floor(Math.random() * 400);
const chromeBin = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const proc = spawn(chromeBin, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--hide-scrollbars",
  "--font-render-hinting=none",
  "--force-color-profile=srgb",
  "--disable-dev-shm-usage",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDir}`,
  "about:blank",
], { stdio: "ignore" });

try {
  const version = await waitForJson(port);
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", () => reject(new Error("Chrome websocket failed.")));
  });
  const cdp = new Cdp(ws);
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 2200,
    height: 4200,
    deviceScaleFactor: 2,
    mobile: false,
  }, sessionId);
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url: `file://${htmlPath}` }, sessionId);
  await Promise.race([
    loaded,
    delay(15000).then(() => {
      throw new Error("The diagram page did not load.");
    }),
  ]);
  const measured = await cdp.send("Runtime.evaluate", {
    expression: `document.fonts.ready.then(() => ({
      loaded: document.fonts.check('800 34px "HORBM Sans"'),
      box: document.getElementById("capture").getBoundingClientRect().toJSON()
    }))`,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  await delay(250);
  const value = measured.result.value;
  if (!value || !value.loaded) {
    throw new Error('HORBM Sans did not load. The PNG would not match the page.');
  }
  const clip = value.box;
  console.log("capture", JSON.stringify(clip));
  const shot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: 1 },
    captureBeyondViewport: true,
  }, sessionId);
  writeFileSync(outPath, Buffer.from(shot.data, "base64"));
  console.log("wrote", outPath);
  ws.close();
} finally {
  proc.kill("SIGKILL");
  rmSync(userDir, { recursive: true, force: true });
  rmSync(htmlPath, { force: true });
}
