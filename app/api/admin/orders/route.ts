import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/supabase";

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await adminDb()
    .from("orders")
    .select("id,stripe_session_id,customer_email,amount_total,currency,payment_status,created_at,order_items(id,title,price_pence,product_id)")
    .order("created_at", { ascending: false })
    .limit(500);
  return error
    ? NextResponse.json({ error: error.message }, { status: 400 })
    : NextResponse.json({ orders: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
