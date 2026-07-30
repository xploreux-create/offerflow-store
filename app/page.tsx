import Store, { Product } from "@/components/Store";
import { adminDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  let products: Product[] = [];
  try {
    const db = adminDb();
    const { data } = await db.from("products").select("id,title,description,category,price_pence,cover_path").eq("status", "published").order("created_at", { ascending: false });
    products = (data ?? []).map(p => ({
      ...p,
      cover_url: p.cover_path ? db.storage.from("product-covers").getPublicUrl(p.cover_path).data.publicUrl : null
    }));
  } catch {}
  return <Store initialProducts={products} />;
}
