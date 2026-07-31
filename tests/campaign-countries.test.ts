import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync(new URL("../components/VendlixaDashboard.tsx", import.meta.url), "utf8");
const generateRoute = readFileSync(new URL("../app/api/admin/campaigns/generate/route.ts", import.meta.url), "utf8");
const launchRoute = readFileSync(new URL("../app/api/admin/campaigns/[id]/launch/route.ts", import.meta.url), "utf8");
const upgrade = readFileSync(new URL("../supabase/production-upgrade.sql", import.meta.url), "utf8");

test("AI builder provides selectable target countries", () => {
  assert.match(dashboard, /name="countries"/);
  assert.match(dashboard, /United Kingdom/);
  assert.match(dashboard, /United States/);
  assert.match(dashboard, /Nigeria/);
  assert.match(dashboard, /form\.getAll\("countries"\)/);
});

test("generation validates and persists multiple target countries", () => {
  assert.match(generateRoute, /countries\.length > 10/);
  assert.match(generateRoute, /target_countries: countries/);
  assert.match(upgrade, /target_countries text\[\]/);
});

test("Meta launch uses the campaign's selected country list", () => {
  assert.match(launchRoute, /geo_locations: \{ countries: campaign\.target_countries/);
});
