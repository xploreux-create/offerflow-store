export type AdVariation = {
  angle: string;
  primaryText: string;
  headline: string;
  description: string;
};

export type AiCampaignPlan = {
  campaignName: string;
  productSummary: string;
  strongestOutcome: string;
  idealCustomer: string;
  painPoints: string[];
  recommendedCountry: string;
  ageMin: number;
  ageMax: number;
  interestNames: string[];
  audienceRationale: string;
  dailyBudgetPence: number;
  durationDays: number;
  targetCpaPence: number;
  budgetRationale: string;
  adVariations: [AdVariation, AdVariation, AdVariation];
  optimizationRules: string[];
};

export function normalizeCampaignPlan(plan: AiCampaignPlan, country: string, budgetCeilingPence: number) {
  plan.recommendedCountry = country;
  plan.dailyBudgetPence = Math.min(Math.max(plan.dailyBudgetPence, 500), budgetCeilingPence);
  if (plan.ageMin > plan.ageMax) [plan.ageMin, plan.ageMax] = [plan.ageMax, plan.ageMin];
  return plan;
}

const campaignSchema = {
  type: "object",
  additionalProperties: false,
  required: ["campaignName", "productSummary", "strongestOutcome", "idealCustomer", "painPoints", "recommendedCountry", "ageMin", "ageMax", "interestNames", "audienceRationale", "dailyBudgetPence", "durationDays", "targetCpaPence", "budgetRationale", "adVariations", "optimizationRules"],
  properties: {
    campaignName: { type: "string", maxLength: 120 },
    productSummary: { type: "string", maxLength: 700 },
    strongestOutcome: { type: "string", maxLength: 240 },
    idealCustomer: { type: "string", maxLength: 500 },
    painPoints: { type: "array", minItems: 3, maxItems: 6, items: { type: "string", maxLength: 160 } },
    recommendedCountry: { type: "string", pattern: "^[A-Z]{2}$" },
    ageMin: { type: "integer", minimum: 18, maximum: 65 },
    ageMax: { type: "integer", minimum: 18, maximum: 65 },
    interestNames: { type: "array", minItems: 3, maxItems: 8, items: { type: "string", maxLength: 80 } },
    audienceRationale: { type: "string", maxLength: 500 },
    dailyBudgetPence: { type: "integer", minimum: 500, maximum: 100000 },
    durationDays: { type: "integer", minimum: 5, maximum: 30 },
    targetCpaPence: { type: "integer", minimum: 100, maximum: 100000 },
    budgetRationale: { type: "string", maxLength: 400 },
    adVariations: {
      type: "array", minItems: 3, maxItems: 3,
      items: {
        type: "object", additionalProperties: false,
        required: ["angle", "primaryText", "headline", "description"],
        properties: {
          angle: { type: "string", maxLength: 80 },
          primaryText: { type: "string", maxLength: 500 },
          headline: { type: "string", maxLength: 100 },
          description: { type: "string", maxLength: 120 },
        },
      },
    },
    optimizationRules: { type: "array", minItems: 3, maxItems: 6, items: { type: "string", maxLength: 180 } },
  },
} as const;

export async function generateCampaignPlan(input: {
  title: string; description: string; category: string; pricePence: number; ebookText: string; preferredCountry: string; maxDailyBudgetPence: number;
}): Promise<AiCampaignPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not connected. Add OPENAI_API_KEY in Vercel.");
  const source = input.ebookText.slice(0, 70000);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      input: [
        { role: "system", content: "You are a careful direct-response strategist for legitimate digital products. Analyse the supplied ebook content, do not invent claims, guarantees, reviews, or Meta interest IDs. Create exactly three clearly different ad angles. Recommend a realistic test budget no higher than the seller's ceiling. Keep all copy accurate, specific, inclusive and suitable for Meta advertising. Return only the requested structured result." },
        { role: "user", content: `PRODUCT\nTitle: ${input.title}\nCategory: ${input.category}\nStore description: ${input.description}\nPrice: £${(input.pricePence / 100).toFixed(2)}\nPreferred market: ${input.preferredCountry}\nMaximum daily budget: £${(input.maxDailyBudgetPence / 100).toFixed(2)}\n\nEBOOK EXTRACT\n${source}` },
      ],
      text: { format: { type: "json_schema", name: "vendlixa_campaign_plan", strict: true, schema: campaignSchema } },
    }),
  });
  const result = await response.json() as { output_text?: string; error?: { message?: string }; status?: string };
  if (!response.ok) throw new Error(result.error?.message || "AI campaign generation failed");
  if (!result.output_text) throw new Error("The AI response was incomplete. Please try again.");
  const plan = JSON.parse(result.output_text) as AiCampaignPlan;
  return normalizeCampaignPlan(plan, input.preferredCountry, input.maxDailyBudgetPence);
}
