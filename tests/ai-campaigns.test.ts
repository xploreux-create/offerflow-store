import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCampaignPlan, type AiCampaignPlan } from "../lib/ai-campaigns.ts";
import { optimizationDecision } from "../lib/optimization-rules.ts";

function plan(): AiCampaignPlan {
  const ad = { angle: "Outcome", primaryText: "Copy", headline: "Headline", description: "Description" };
  return {
    campaignName: "Campaign", productSummary: "Summary", strongestOutcome: "Outcome", idealCustomer: "Customer",
    painPoints: ["One", "Two", "Three"], recommendedCountry: "US", ageMin: 50, ageMax: 25,
    interestNames: ["Creators", "Marketing", "Business"], audienceRationale: "Reason", dailyBudgetPence: 5000,
    durationDays: 7, targetCpaPence: 1000, budgetRationale: "Reason", adVariations: [ad, ad, ad], optimizationRules: ["One", "Two", "Three"],
  };
}

test("AI plan obeys seller country, age order and budget ceiling", () => {
  const result = normalizeCampaignPlan(plan(), "GB", 1500);
  assert.equal(result.recommendedCountry, "GB");
  assert.equal(result.dailyBudgetPence, 1500);
  assert.deepEqual([result.ageMin, result.ageMax], [25, 50]);
});

test("optimizer pauses an ad only after protected spend and impression limits", () => {
  assert.equal(optimizationDecision({ impressions: 1200, spend: 16, purchases: 0, targetCpa: 10 }).pause, true);
  assert.equal(optimizationDecision({ impressions: 500, spend: 16, purchases: 0, targetCpa: 10 }).pause, false);
});

test("optimizer scales only proven low-CPA performance", () => {
  assert.equal(optimizationDecision({ impressions: 3000, spend: 20, purchases: 3, targetCpa: 10 }).qualifiesForScale, true);
  assert.equal(optimizationDecision({ impressions: 3000, spend: 35, purchases: 3, targetCpa: 10 }).qualifiesForScale, false);
});
