import { NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase";
import { optimizeCampaign } from "@/lib/meta-optimizer";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: campaigns, error } = await adminDb().from("campaigns")
    .select("*").eq("auto_optimize", true).not("meta_campaign_id", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const results = [];
  for (const campaign of campaigns ?? []) {
    try { results.push({ id: campaign.id, ok: true, result: await optimizeCampaign(campaign) }); }
    catch (optimizationError) { results.push({ id: campaign.id, ok: false, error: optimizationError instanceof Error ? optimizationError.message : "Optimisation failed" }); }
  }
  return NextResponse.json({ processed: results.length, results });
}
