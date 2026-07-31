import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/supabase";
import { campaignStatuses, metaReadiness, validateCampaign, MARKET_CODES } from "@/lib/campaigns";

async function recommendMarkets(title: string, description: string, category: string, requested: string[]) {
  const fallback = requested.length ? requested : ["US", "GB", "CA", "AU", "IE"];
  if (!process.env.OPENAI_API_KEY) return { countries: fallback, rationale: "Selected from the recommended English-speaking markets." };
  try {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", input: `Choose the strongest Meta ad countries for this ebook. Return JSON only with countries (2-letter codes, 3-6 items) and rationale (one sentence). Consider topic, language, likely buying power and digital-product fit. Ebook: ${title}; category: ${category}; description: ${description}. Supported codes: ${MARKET_CODES.join(",")}.` }) });
    const data = await response.json();
    const text = data.output?.flatMap((o: any) => o.content ?? []).find((c: any) => c.type === "output_text")?.text ?? "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const countries = Array.isArray(parsed.countries) ? parsed.countries.map(String).map((v: string) => v.toUpperCase()).filter((v: string) => MARKET_CODES.includes(v as never)).slice(0, 6) : [];
    return { countries: countries.length ? countries : fallback, rationale: String(parsed.rationale || "AI selected markets based on ebook fit.") };
  } catch { return { countries: fallback, rationale: "AI recommendation was unavailable; recommended markets were selected automatically." }; }
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await adminDb().from("campaigns")
    .select("*, products(id,title,status,cover_path)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ campaigns: data, meta: metaReadiness() });
}

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = validateCampaign(await request.json());
    const db = adminDb();
    const { data: product } = await db.from("products").select("id,status,title,description,category").eq("id", input.productId).single();
    if (!product || product.status !== "published") {
      return NextResponse.json({ error: "Campaigns can only use a published product" }, { status: 400 });
    }
    const recommendation = input.countryMode === "ai" ? await recommendMarkets(product.title, product.description, product.category, []) : { countries: input.countries, rationale: "Selected manually." };
    const { data, error } = await db.from("campaigns").insert({
      name: input.name, product_id: input.productId, objective: "OUTCOME_SALES",
      country: recommendation.countries[0], target_countries: recommendation.countries, targeting_recommendations: { mode: input.countryMode, rationale: recommendation.rationale }, age_min: input.ageMin, age_max: input.ageMax,
      daily_budget_pence: input.dailyBudgetPence, duration_days: input.durationDays,
      primary_text: input.primaryText, headline: input.headline,
      interest_ids: input.interestIds, status: "draft",
    }).select("*, products(id,title,status,cover_path)").single();
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ campaign: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid campaign" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  if (!id || !campaignStatuses.includes(status as never)) return NextResponse.json({ error: "Invalid campaign update" }, { status: 400 });
  const { error } = await adminDb().from("campaigns").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
  const { data: campaign } = await adminDb().from("campaigns").select("status").eq("id", id).single();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.status === "active") return NextResponse.json({ error: "Pause the campaign before deleting it" }, { status: 409 });
  const { error } = await adminDb().from("campaigns").delete().eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ deleted: true });
}
