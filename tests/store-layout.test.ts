import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("public store does not create an overflow ancestor that disables sticky basket", () => {
  assert.match(css, /\.public-store-main\s*\{[^}]*overflow:\s*visible/s);
});

test("basket remains sticky on desktop and tablet store layouts", () => {
  assert.match(css, /\.basket-panel\s*\{[^}]*position:\s*sticky/s);
  assert.match(css, /\.public-store-content \.basket-panel\s*\{[^}]*position:\s*sticky/s);
});

test("mobile store returns basket to normal document flow", () => {
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.public-store-content \.basket-panel\s*\{[^}]*position:\s*static/s);
});
