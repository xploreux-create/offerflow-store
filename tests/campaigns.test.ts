import test from "node:test";
import assert from "node:assert/strict";
import { validateCampaign } from "../lib/campaigns.ts";

const valid = {
  name: "UGC launch", productId: "11111111-1111-4111-8111-111111111111",
  country: "gb", ageMin: 18, ageMax: 45, dailyBudget: "10",
  durationDays: 7, primaryText: "Land your first UGC collaboration.",
  headline: "UGC Brand Deal Starter Toolkit", interestIds: "123, 456",
};

test("normalises a valid campaign and calculates pence", () => {
  const result = validateCampaign(valid);
  assert.equal(result.country, "GB");
  assert.equal(result.dailyBudgetPence, 1000);
  assert.deepEqual(result.interestIds, ["123", "456"]);
});

test("rejects an invalid age range", () => {
  assert.throws(() => validateCampaign({ ...valid, ageMin: 50, ageMax: 20 }), /age range/);
});

test("rejects a budget below the safe minimum", () => {
  assert.throws(() => validateCampaign({ ...valid, dailyBudget: ".50" }), /Daily budget/);
});

test("rejects non-numeric Meta interest IDs", () => {
  assert.throws(() => validateCampaign({ ...valid, interestIds: "fitness" }), /numbers only/);
});
