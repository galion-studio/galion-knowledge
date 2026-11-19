import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

function htmlFiles(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) htmlFiles(full, found);
    else if (name.endsWith(".html")) found.push(full);
  }
  return found;
}

test("built assets use the same commit as the rest of the site", () => {
  const home = readFileSync("_site/index.html", "utf8");
  const page = readFileSync("_site/horbm/interactive/index.html", "utf8");
  const viewer = readFileSync("_site/horbm/interactive/viewer.js", "utf8");
  const adminPage = readFileSync("_site/horbm/interactive/admin/index.html", "utf8");
  const admin = readFileSync("_site/horbm/interactive/admin/admin.js", "utf8");
  const version = home.match(/site\.css\?v=([A-Za-z0-9._-]+)/)[1];
  const joined = [page, viewer, adminPage, admin].join("\n");
  for (const name of [
    "viewer.css", "diagram.css", "viewer.js", "diagram.js", "progress.js",
    "github.js", "fit.js", "horbm.json", "build.json", "development.json",
    "admin.css", "admin.js", "html2canvas.min.js",
  ]) {
    expect(joined, name).toContain(`${name}?v=${version}`);
  }
  expect(viewer).toContain("horbm.json&sha=master");
  expect(joined).not.toContain(`horbm.json?v=${version}&sha`);
});

test("public pages do not link the admin board", () => {
  const root = path.resolve("_site");
  const hits = htmlFiles(root).filter((file) => {
    if (file.includes(`${path.sep}horbm${path.sep}interactive${path.sep}admin${path.sep}`)) return false;
    return /horbm\/interactive\/admin/.test(readFileSync(file, "utf8"));
  });
  expect(hits).toEqual([]);
});

test("the diagram fits a 1280x800 window and shows a real percent", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/horbm/interactive/");
  await page.waitForFunction(() => {
    const capture = document.getElementById("capture");
    const viewport = document.getElementById("viewport");
    const zoom = document.getElementById("zoomread")?.textContent?.trim();
    const overall = document.getElementById("overall")?.textContent || "";
    if (!capture || !viewport || !capture.querySelector(".lrow")) return false;
    const box = capture.getBoundingClientRect();
    const view = viewport.getBoundingClientRect();
    return box.width > 600
      && box.width <= view.width + 2
      && box.left >= view.left - 2
      && zoom
      && zoom !== "5%"
      && /\d% complete/.test(overall);
  });
  const box = await page.locator("#capture").boundingBox();
  expect(box.width).toBeGreaterThan(600);
  expect((await page.locator("#zoomread").textContent()).trim()).not.toBe("5%");
  await expect(page.locator("#overall")).toHaveText(/\d% complete/);
  const labels = (await page.locator("button, a").allTextContents()).join("\n");
  expect(labels.toLowerCase()).not.toMatch(/propose/);
  expect(labels.toLowerCase()).not.toMatch(/\bedit\b/);
  const hrefs = await page.locator("a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") || ""));
  expect(hrefs.some((href) => href.includes("admin"))).toBe(false);
});

test("the diagram fits a phone without a 5% thumbnail", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/horbm/interactive/");
  await page.waitForFunction(() => {
    const capture = document.getElementById("capture");
    const viewport = document.getElementById("viewport");
    const zoom = document.getElementById("zoomread")?.textContent?.trim();
    const overall = document.getElementById("overall")?.textContent || "";
    if (!capture || !viewport || !capture.querySelector(".lrow")) return false;
    const box = capture.getBoundingClientRect();
    const view = viewport.getBoundingClientRect();
    return box.width > 120
      && box.width <= view.width + 2
      && box.height <= view.height + 2
      && zoom !== "5%"
      && /\d% complete/.test(overall);
  });
});
