import { adminDb } from "@/lib/supabase";
import { optimizationDecision } from "@/lib/optimization-rules";

type Insight = { ad_id: string; impressions?: string; spend?: string; actions?: Array<{ action_type: string; value: string }> };

async function metaRequest(path: string, init?: RequestInit) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("Meta is not connected");
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`https://graph.facebook.com/v25.0/${path}${separator}access_token=${encodeURIComponent(token)}`, init);
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error?.message || "Meta optimisation request failed");
  return result;
}

async function updateMetaObject(id: string, fields: Record<string, string>) {
  return metaRequest(id, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields) });
}

export async function optimizeCampaign(campaign: Record<string, any>) {
  const targetCpa = Math.max(Number(campaign.target_cpa_pence || 1000), 100) / 100;
  const insights = await metaRequest(`${campaign.meta_campaign_id}/insights?level=ad&date_preset=last_7d&fields=ad_id,impressions,spend,actions`) as { data?: Insight[] };
  const rows = insights.data ?? [];
  const actions: Array<Record<string, unknown>> = [];
  let totalPurchases = 0;
  let totalSpend = 0;

  for (const row of rows) {
    const impressions = Number(row.impressions || 0);
    const spend = Number(row.spend || 0);
    const purchases = Number(row.actions?.find((item) => ["purchase", "offsite_conversion.fb_pixel_purchase"].includes(item.action_type))?.value || 0);
    totalPurchases += purchases;
    totalSpend += spend;
    if (optimizationDecision({ impressions, spend, purchases, targetCpa }).pause) {
      await updateMetaObject(row.ad_id, { status: "PAUSED" });
      actions.push({ type: "pause_ad", adId: row.ad_id, reason: "No purchase after the protected test limit", spend, impressions });
    }
  }

  const actualCpa = totalPurchases ? totalSpend / totalPurchases : null;
  if (actualCpa && optimizationDecision({ impressions: 0, spend: totalSpend, purchases: totalPurchases, targetCpa }).qualifiesForScale) {
    const current = Number(campaign.daily_budget_pence);
    const ceiling = Math.max(Number(campaign.max_daily_budget_pence || current), current);
    const next = Math.min(Math.round(current * 1.15), ceiling);
    if (next > current) {
      await updateMetaObject(campaign.meta_adset_id, { daily_budget: String(next) });
      actions.push({ type: "increase_budget", fromPence: current, toPence: next, reason: "CPA is at least 20% below target" });
      await adminDb().from("campaigns").update({ daily_budget_pence: next }).eq("id", campaign.id);
    }
  }

  const entry = { at: new Date().toISOString(), spend: totalSpend, purchases: totalPurchases, actualCpa, actions };
  const history = [...(campaign.optimization_log ?? []), entry].slice(-30);
  await adminDb().from("campaigns").update({ optimization_log: history, last_optimized_at: entry.at, updated_at: entry.at }).eq("id", campaign.id);
  return entry;
}
