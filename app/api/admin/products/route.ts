import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/supabase";

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await adminDb().from("products").select("*").order("created_at", { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ products: data });
}

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
  if (!title || !body.pdfPath || !body.pdfName) return NextResponse.json({ error: "Title and PDF are required" }, { status: 400 });
  const { data, error } = await adminDb().from("products").insert({
    title, slug, description: String(body.description ?? ""), category: String(body.category ?? "Business"),
    price_pence: Math.round(Number(body.price) * 100), cover_path: body.coverPath || null,
    pdf_path: body.pdfPath, pdf_name: body.pdfName, pdf_size: Number(body.pdfSize) || 0, status: body.status === "published" ? "published" : "draft"
  }).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ product: data });
}

export async function PATCH(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status } = await request.json();
  const { error } = await adminDb().from("products").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
