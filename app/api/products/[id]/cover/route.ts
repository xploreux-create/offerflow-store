import { NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = adminDb();
  const { data: product } = await db.from("products").select("cover_path").eq("id", id).single();
  if (!product?.cover_path) return new NextResponse("Cover not found", { status: 404 });
  const url = db.storage.from("product-covers").getPublicUrl(product.cover_path).data.publicUrl;
  return NextResponse.redirect(url);
}
