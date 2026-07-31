import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../components/PublicShop.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("ebook covers open in an accessible full-screen dialog", () => {
  assert.match(component, /className="cover-lightbox" role="dialog" aria-modal="true"/);
  assert.match(component, /event\.key === "Escape"/);
  assert.match(component, /View full cover/);
});

test("full-screen cover remains contained within the viewport", () => {
  assert.match(css, /\.cover-lightbox\s*\{[^}]*position:\s*fixed[^}]*inset:\s*0/s);
  assert.match(css, /\.cover-lightbox figure > img\s*\{[^}]*object-fit:\s*contain/s);
});
