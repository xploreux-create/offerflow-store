import { NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase";
import { stripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const { productIds } = await request.json();
    if (!Array.isArray(productIds) || !productIds.length) return NextResponse.json({ error: "Your basket is empty" }, { status: 400 });
    const ids = [...new Set(productIds.filter((id): id is string => typeof id === "string"))];
    if (ids.length > 10) return NextResponse.json({ error: "You can purchase up to 10 products in one order" }, { status: 400 });
    const { data: products, error } = await adminDb().from("products").select("id,title,price_pence").in("id", ids).eq("status", "published");
    if (error || !products || products.length !== ids.length) return NextResponse.json({ error: "One or more products are unavailable" }, { status: 400 });
    const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      line_items: products.map(p => ({ quantity: 1, price_data: { currency: "gbp", unit_amount: p.price_pence, product_data: { name: p.title } } })),
      success_url: `${site}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/?checkout=cancelled`,
      customer_creation: "always",
      allow_promotion_codes: true,
      metadata: { product_ids: products.map(p => p.id).join(",") }
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Secure checkout is temporarily unavailable" }, { status: 500 });
  }
}
