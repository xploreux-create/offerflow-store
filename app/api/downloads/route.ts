import { NextResponse } from "next/server";
import { stripeClient } from "@/lib/stripe";
import { adminDb } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (!sessionId?.startsWith("cs_")) return NextResponse.json({ error: "Invalid order reference" }, { status: 400 });
    const session = await stripeClient().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return NextResponse.json({ error: "Payment has not been confirmed" }, { status: 402 });
    const ids = (session.metadata?.product_ids ?? "").split(",").filter(Boolean);
    const db = adminDb();
    const { data: products } = await db.from("products").select("id,title,pdf_path,pdf_name").in("id", ids);
    const downloads = await Promise.all((products ?? []).map(async p => {
      const { data } = await db.storage.from("product-files").createSignedUrl(p.pdf_path, 3600, { download: p.pdf_name });
      return { id: p.id, title: p.title, url: data?.signedUrl };
    }));
    return NextResponse.json({ email: session.customer_details?.email, downloads: downloads.filter(d => d.url) });
  } catch {
    return NextResponse.json({ error: "We could not verify this order" }, { status: 400 });
  }
}
