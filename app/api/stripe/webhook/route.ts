import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripeClient } from "@/lib/stripe";
import { adminDb } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(request: Request) {
  const signature = (await headers()).get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return new NextResponse("Webhook is not configured", { status: 400 });
  try {
    const event = stripeClient().webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const db = adminDb();
      const { data: order } = await db.from("orders").upsert({
        stripe_session_id: session.id, customer_email: session.customer_details?.email,
        amount_total: session.amount_total ?? 0, currency: session.currency ?? "gbp", payment_status: session.payment_status
      }, { onConflict: "stripe_session_id" }).select("id").single();
      const ids = (session.metadata?.product_ids ?? "").split(",").filter(Boolean);
      const { data: products } = await db.from("products").select("id,title,price_pence").in("id", ids);
      if (order && products?.length) {
        await db.from("order_items").delete().eq("order_id", order.id);
        await db.from("order_items").insert(products.map(p => ({ order_id: order.id, product_id: p.id, title: p.title, price_pence: p.price_pence })));
      }
    }
    return NextResponse.json({ received: true });
  } catch {
    return new NextResponse("Invalid webhook signature", { status: 400 });
  }
}
