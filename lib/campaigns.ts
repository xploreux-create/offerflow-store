export const campaignStatuses = ["draft", "ready", "paused", "active", "completed"] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

export type CampaignInput = {
  name: string;
  productId: string;
  country: string;
  countries: string[];
  countryMode: "ai" | "custom";
  ageMin: number;
  ageMax: number;
  dailyBudgetPence: number;
  durationDays: number;
  primaryText: string;
  headline: string;
  interestIds: string[];
};

export const MARKET_CODES = ["US","GB","CA","AU","DE","NL","IE","NZ","SG","ZA","NG","GH","IN","AE","FR","ES","BR","JP","KR","IT","MX"] as const;

export function validateCampaign(body: Record<string, unknown>): CampaignInput {
  const name = String(body.name ?? "").trim();
  const productId = String(body.productId ?? "").trim();
  const countryMode = body.countryMode === "custom" ? "custom" : "ai";
  const countries = Array.isArray(body.countries) ? body.countries.map(String).map((v) => v.toUpperCase()).filter((v) => MARKET_CODES.includes(v as never)) : [];
  const country = (countries[0] ?? String(body.country ?? "GB").trim().toUpperCase());
  const ageMin = Number(body.ageMin);
  const ageMax = Number(body.ageMax);
  const dailyBudgetPence = Math.round(Number(body.dailyBudget) * 100);
  const durationDays = Number(body.durationDays);
  const primaryText = String(body.primaryText ?? "").trim();
  const headline = String(body.headline ?? "").trim();
  const interestIds = String(body.interestIds ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);

  if (!name || name.length > 120) throw new Error("Enter a campaign name (maximum 120 characters)");
  if (!/^[0-9a-f-]{36}$/i.test(productId)) throw new Error("Choose a published product");
  if (!MARKET_CODES.includes(country as never)) throw new Error("Choose a supported target market");
  if (countryMode === "custom" && !countries.length) throw new Error("Choose at least one target market");
  if (!Number.isInteger(ageMin) || !Number.isInteger(ageMax) || ageMin < 18 || ageMax > 65 || ageMin > ageMax) {
    throw new Error("Choose an age range between 18 and 65");
  }
  if (!Number.isFinite(dailyBudgetPence) || dailyBudgetPence < 100 || dailyBudgetPence > 1000000) {
    throw new Error("Daily budget must be between £1 and £10,000");
  }
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 90) {
    throw new Error("Duration must be between 1 and 90 days");
  }
  if (!primaryText || primaryText.length > 500) throw new Error("Enter primary ad text (maximum 500 characters)");
  if (!headline || headline.length > 100) throw new Error("Enter an ad headline (maximum 100 characters)");
  if (interestIds.some((id) => !/^\d+$/.test(id))) throw new Error("Meta interest IDs must contain numbers only");

  return { name, productId, country, countries: countries.length ? countries : [country], countryMode, ageMin, ageMax, dailyBudgetPence, durationDays, primaryText, headline, interestIds };
}

export function metaReadiness(product?: { cover_path: string | null }) {
  const required = {
    META_ACCESS_TOKEN: Boolean(process.env.META_ACCESS_TOKEN),
    META_AD_ACCOUNT_ID: Boolean(process.env.META_AD_ACCOUNT_ID),
    META_PIXEL_ID: Boolean(process.env.META_PIXEL_ID),
    META_PAGE_ID: Boolean(process.env.META_PAGE_ID),
    NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };
  const missing = Object.entries(required).filter(([, ok]) => !ok).map(([key]) => key);
  if (product && !product.cover_path) missing.push("PRODUCT_COVER");
  return { connected: missing.length === 0, required, missing };
}
