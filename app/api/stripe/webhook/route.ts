import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripeClient } from "@/lib/stripe";
import { adminDb } from "@/lib/supabase";
import Stripe from "stripe";

async function sendDownloadEmail(session: Stripe.Checkout.Session, productTitles: string[]) {
  const email = session.customer_details?.email;
  const apiKey = process.env.RESEND_API_KEY;
  if (!email || !apiKey) return;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const orderUrl = `${site}/success?session_id=${encodeURIComponent(session.id)}`;
  const items = productTitles.map((title) => `<li>${title}</li>`).join("");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Vendlixa <orders@vandlixa.com>",
      to: [email],
      subject: "Your Vendlixa download is ready",
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#32153f"><h1>Thank you for your purchase</h1><p>Your digital products are ready to download:</p><ul>${items}</ul><p><a href="${orderUrl}" style="display:inline-block;padding:13px 20px;background:#c9f25b;color:#32153f;text-decoration:none;font-weight:bold;border-radius:8px">Open my downloads</a></p><p>This secure page creates private download links that remain active for one hour. If you close the page, simply use this email again.</p><p>Need help? Contact <a href="mailto:help@vandlixa.com">help@vandlixa.com</a>.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Download email failed: ${response.status}`);
}

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
        try { await sendDownloadEmail(session, products.map(p => p.title)); } catch (emailError) { console.error("Download email failed after successful payment", emailError); }
      }
    }
    return NextResponse.json({ received: true });
  } catch {
    return new NextResponse("Invalid webhook signature", { status: 400 });
  }
}
