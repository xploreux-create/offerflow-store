import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/supabase";

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await adminDb().from("products").select("*").neq("status", "archived").order("created_at", { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ products: data });
}

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const category = String(body.category ?? "").trim();
  const pricePence = Math.round(Number(body.price) * 100);
  const pdfSize = Number(body.pdfSize);
  const status = body.status === "published" ? "published" : "draft";
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
  if (!title || title.length > 140) return NextResponse.json({ error: "Enter a valid product title" }, { status: 400 });
  if (!description || description.length > 800) return NextResponse.json({ error: "Enter a valid product description" }, { status: 400 });
  if (!category || category.length > 80) return NextResponse.json({ error: "Choose a valid category" }, { status: 400 });
  if (!Number.isFinite(pricePence) || pricePence < 50 || pricePence > 999900) return NextResponse.json({ error: "Enter a price between £0.50 and £9,999" }, { status: 400 });
  if (!body.pdfPath || !body.pdfName || !Number.isFinite(pdfSize) || pdfSize <= 0 || pdfSize > 209715200) return NextResponse.json({ error: "A valid PDF is required" }, { status: 400 });
  const { data, error } = await adminDb().from("products").insert({
    title, slug, description, category, price_pence: pricePence, cover_path: body.coverPath || null,
    pdf_path: body.pdfPath, pdf_name: String(body.pdfName).slice(0, 255), pdf_size: pdfSize, status
  }).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ product: data });
}

export async function PATCH(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!["draft", "published"].includes(body.status)) return NextResponse.json({ error: "Invalid product status" }, { status: 400 });
    update.status = body.status;
  }
  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title || title.length > 140) return NextResponse.json({ error: "Enter a valid product title" }, { status: 400 });
    update.title = title;
  }
  if (body.description !== undefined) {
    const description = String(body.description).trim();
    if (!description || description.length > 800) return NextResponse.json({ error: "Enter a valid product description" }, { status: 400 });
    update.description = description;
  }
  if (body.category !== undefined) {
    const category = String(body.category).trim();
    if (!category || category.length > 80) return NextResponse.json({ error: "Choose a valid category" }, { status: 400 });
    update.category = category;
  }
  if (body.price !== undefined) {
    const pricePence = Math.round(Number(body.price) * 100);
    if (!Number.isFinite(pricePence) || pricePence < 50 || pricePence > 999900) return NextResponse.json({ error: "Enter a price between £0.50 and £9,999" }, { status: 400 });
    update.price_pence = pricePence;
  }
  if (Object.keys(update).length === 1) return NextResponse.json({ error: "No product changes supplied" }, { status: 400 });
  const { error } = await adminDb().from("products").update(update).eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
  const db = adminDb();
  const { data: product, error: findError } = await db.from("products").select("pdf_path,cover_path").eq("id", id).single();
  if (findError || !product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const { count } = await db.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id);
  if (count) {
    const { error } = await db.from("products").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id);
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ archived: true });
  }
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await db.storage.from("product-files").remove([product.pdf_path]);
  if (product.cover_path) await db.storage.from("product-covers").remove([product.cover_path]);
  return NextResponse.json({ deleted: true });
}
