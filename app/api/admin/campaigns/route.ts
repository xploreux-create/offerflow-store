import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/supabase";
import { campaignStatuses, metaReadiness, validateCampaign } from "@/lib/campaigns";

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await adminDb().from("campaigns")
    .select("*, products(id,title,status,cover_path)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ campaigns: data, meta: metaReadiness(), ai: { connected: Boolean(process.env.OPENAI_API_KEY) } });
}

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = validateCampaign(await request.json());
    const db = adminDb();
    const { data: product } = await db.from("products").select("id,status").eq("id", input.productId).single();
    if (!product || product.status !== "published") {
      return NextResponse.json({ error: "Campaigns can only use a published product" }, { status: 400 });
    }
    const { data, error } = await db.from("campaigns").insert({
      name: input.name, product_id: input.productId, objective: "OUTCOME_SALES",
      country: input.country, age_min: input.ageMin, age_max: input.ageMax,
      target_countries: [input.country],
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
