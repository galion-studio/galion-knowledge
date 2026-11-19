import assert from "node:assert/strict";
import test from "node:test";

import { fitPlacement } from "../../src/horbm/interactive/fit.js";

const PLATE = { width: 2060, height: 2559 };

test("a zero or collapsed pane is not clamped to 5%", () => {
  assert.equal(fitPlacement(0, 0, PLATE.width, PLATE.height), null);
  assert.equal(fitPlacement(50, 2711, PLATE.width, PLATE.height), null);
  assert.equal(fitPlacement(10, 10, PLATE.width, PLATE.height), null);
});

test("a 1280 desktop pane draws the plate wider than 600px", () => {
  const place = fitPlacement(940, 647, PLATE.width, PLATE.height);
  assert.ok(place);
  const drawn = PLATE.width * place.scale;
  assert.ok(drawn > 600, `drawn width ${drawn}`);
  assert.ok(drawn <= 940);
  assert.notEqual(Math.round(place.scale * 100), 5);
  assert.ok(place.y >= 0);
});

test("a phone shows the whole plate inside the viewport", () => {
  const place = fitPlacement(390, 550, PLATE.width, PLATE.height);
  assert.ok(place);
  assert.ok(PLATE.width * place.scale <= 390);
  assert.ok(PLATE.height * place.scale <= 550);
  assert.notEqual(Math.round(place.scale * 100), 5);
});
