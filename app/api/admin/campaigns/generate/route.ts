import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { isAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/supabase";
import { generateCampaignPlan } from "@/lib/ai-campaigns";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const productId = String(body.productId ?? "");
    const country = String(body.country ?? "GB").trim().toUpperCase();
    const maxDailyBudgetPence = Math.round(Number(body.maxDailyBudget) * 100);
    const autoOptimize = body.autoOptimize !== false;
    if (!/^[0-9a-f-]{36}$/i.test(productId)) throw new Error("Choose a published ebook");
    if (!/^[A-Z]{2}$/.test(country)) throw new Error("Use a valid two-letter country code");
    if (!Number.isFinite(maxDailyBudgetPence) || maxDailyBudgetPence < 500 || maxDailyBudgetPence > 1000000) {
      throw new Error("Set a maximum daily budget between £5 and £10,000");
    }

    const db = adminDb();
    const { data: product, error: productError } = await db.from("products")
      .select("id,title,description,category,price_pence,pdf_path,pdf_size,status")
      .eq("id", productId).single();
    if (productError || !product || product.status !== "published") throw new Error("Choose a published ebook");
    if (Number(product.pdf_size) > 100 * 1024 * 1024) throw new Error("AI analysis currently supports PDF files up to 100 MB");

    const { data: pdfFile, error: downloadError } = await db.storage.from("product-files").download(product.pdf_path);
    if (downloadError || !pdfFile) throw new Error("The ebook could not be opened for analysis");
    const parsed = await pdfParse(Buffer.from(await pdfFile.arrayBuffer()));
    const ebookText = parsed.text.replace(/\s+/g, " ").trim();
    if (ebookText.length < 500) throw new Error("This PDF does not contain enough readable text for AI analysis");

    const plan = await generateCampaignPlan({
      title: product.title, description: product.description, category: product.category,
      pricePence: product.price_pence, ebookText, preferredCountry: country, maxDailyBudgetPence,
    });
    const firstAd = plan.adVariations[0];
    const { data: campaign, error } = await db.from("campaigns").insert({
      product_id: product.id,
      name: plan.campaignName,
      objective: "OUTCOME_SALES",
      country: plan.recommendedCountry,
      age_min: plan.ageMin,
      age_max: plan.ageMax,
      daily_budget_pence: plan.dailyBudgetPence,
      duration_days: plan.durationDays,
      primary_text: firstAd.primaryText,
      headline: firstAd.headline,
      interest_ids: [],
      status: "ready",
      ai_generated: true,
      ai_analysis: {
        productSummary: plan.productSummary,
        strongestOutcome: plan.strongestOutcome,
        idealCustomer: plan.idealCustomer,
        painPoints: plan.painPoints,
        budgetRationale: plan.budgetRationale,
        pagesAnalysed: parsed.numpages,
        model: process.env.OPENAI_MODEL || "gpt-5.6",
      },
      ad_variations: plan.adVariations,
      targeting_recommendations: {
        interestNames: plan.interestNames,
        rationale: plan.audienceRationale,
        optimizationRules: plan.optimizationRules,
      },
      auto_optimize: autoOptimize,
      target_cpa_pence: plan.targetCpaPence,
      max_daily_budget_pence: maxDailyBudgetPence,
    }).select("*, products(id,title,status,cover_path)").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ campaign });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI campaign generation failed" }, { status: 400 });
  }
}
