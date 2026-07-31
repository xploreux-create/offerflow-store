import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/supabase";
import { metaReadiness } from "@/lib/campaigns";

async function metaPost(path: string, fields: Record<string, string>) {
  const token = process.env.META_ACCESS_TOKEN!;
  const response = await fetch(`https://graph.facebook.com/v25.0/${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...fields, access_token: token }),
  });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error?.message || "Meta rejected the request");
  return result as { id: string };
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const db = adminDb();
  const { data: campaign, error } = await db.from("campaigns")
    .select("*, products(id,title,slug,status,cover_path)")
    .eq("id", id).single();
  if (error || !campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.meta_campaign_id) return NextResponse.json({ error: "This campaign has already been sent to Meta" }, { status: 409 });
  if (campaign.products?.status !== "published") return NextResponse.json({ error: "Publish the selected product first" }, { status: 400 });
  const readiness = metaReadiness(campaign.products);
  if (!readiness.connected) return NextResponse.json({ error: `Meta setup is incomplete: ${readiness.missing.join(", ")}`, readiness }, { status: 400 });

  const account = process.env.META_AD_ACCOUNT_ID!.replace(/^act_/, "");
  const site = process.env.NEXT_PUBLIC_SITE_URL!.replace(/\/$/, "");
  const destination = `${site}/store?product=${campaign.product_id}`;
  const picture = `${site}/api/products/${campaign.product_id}/cover`;
  const start = new Date(Date.now() + 10 * 60 * 1000);
  const end = new Date(start.getTime() + campaign.duration_days * 86400000);

  try {
    const metaCampaign = await metaPost(`act_${account}/campaigns`, {
      name: campaign.name, objective: "OUTCOME_SALES", status: "PAUSED", special_ad_categories: "[]",
    });
    const interests = (campaign.interest_ids ?? []).map((interestId: string) => ({ id: interestId }));
    const targeting: Record<string, unknown> = {
      geo_locations: { countries: campaign.target_countries?.length ? campaign.target_countries : [campaign.country] },
      age_min: campaign.age_min, age_max: campaign.age_max,
    };
    if (interests.length) targeting.interests = interests;
    const adSet = await metaPost(`act_${account}/adsets`, {
      name: `${campaign.name} audience`, campaign_id: metaCampaign.id,
      daily_budget: String(campaign.daily_budget_pence), billing_event: "IMPRESSIONS",
      optimization_goal: "OFFSITE_CONVERSIONS", bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: JSON.stringify(targeting),
      promoted_object: JSON.stringify({ pixel_id: process.env.META_PIXEL_ID, custom_event_type: "PURCHASE" }),
      start_time: start.toISOString(), end_time: end.toISOString(), status: "PAUSED",
    });
    const creative = await metaPost(`act_${account}/adcreatives`, {
      name: `${campaign.name} creative`,
      object_story_spec: JSON.stringify({
        page_id: process.env.META_PAGE_ID,
        link_data: {
          link: destination, picture, message: campaign.primary_text, name: campaign.headline,
          description: campaign.products.title,
          call_to_action: { type: "SHOP_NOW", value: { link: destination } },
        },
      }),
    });
    const ad = await metaPost(`act_${account}/ads`, {
      name: `${campaign.name} ad`, adset_id: adSet.id,
      creative: JSON.stringify({ creative_id: creative.id }), status: "PAUSED",
    });
    await db.from("campaigns").update({
      status: "paused", meta_campaign_id: metaCampaign.id, meta_adset_id: adSet.id,
      meta_creative_id: creative.id, meta_ad_id: ad.id, launched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    return NextResponse.json({ ok: true, status: "paused", metaCampaignId: metaCampaign.id });
  } catch (launchError) {
    return NextResponse.json({ error: launchError instanceof Error ? launchError.message : "Meta launch failed" }, { status: 502 });
  }
}
