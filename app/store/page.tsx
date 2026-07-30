import PublicShop from "@/components/PublicShop";
import { adminDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const db = adminDb();
  const { data } = await db.from("products")
    .select("id,title,description,category,price_pence,pdf_size,cover_path")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  const products = (data ?? []).map((product) => ({
    id: product.id,
    title: product.title,
    description: product.description,
    category: product.category,
    price: product.price_pence / 100,
    pdfSize: product.pdf_size,
    coverUrl: product.cover_path ? db.storage.from("product-covers").getPublicUrl(product.cover_path).data.publicUrl : null,
  }));
  return <PublicShop products={products} />;
}
