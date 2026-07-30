"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { browserDb } from "@/lib/supabase";

type Section = "overview" | "products" | "orders" | "store" | "settings";
type Product = {
  id: string;
  title: string;
  description: string;
  category: string;
  price_pence: number;
  pdf_name: string;
  pdf_size: number;
  cover_path: string | null;
  status: "draft" | "published" | "archived";
  created_at: string;
};
type OrderItem = { id: string; title: string; price_pence: number; product_id: string };
type Order = {
  id: string;
  stripe_session_id: string;
  customer_email: string | null;
  amount_total: number;
  currency: string;
  payment_status: string;
  created_at: string;
  order_items: OrderItem[];
};

const nav: Array<{ id: Section; icon: string; label: string }> = [
  { id: "overview", icon: "⌂", label: "Overview" },
  { id: "products", icon: "□", label: "Products" },
  { id: "orders", icon: "◎", label: "Orders" },
  { id: "store", icon: "▣", label: "Store" },
  { id: "settings", icon: "⚙", label: "Settings" },
];

const categories = [
  "UGC & Creator", "Digital Products", "Faceless Marketing", "Business",
  "Finance", "Social Media", "E-commerce", "Templates & Planners",
  "AI & Productivity", "Branding", "Marketing", "Family & Education",
];

function money(pence: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(pence / 100);
}

export default function OfferFlowDashboard() {
  const [section, setSection] = useState<Section>("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [productModal, setProductModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [productsResponse, ordersResponse] = await Promise.all([
        fetch("/api/admin/products", { cache: "no-store" }),
        fetch("/api/admin/orders", { cache: "no-store" }),
      ]);
      if (productsResponse.status === 401 || ordersResponse.status === 401) {
        window.location.assign("/admin/login");
        return;
      }
      const productData = await productsResponse.json();
      const orderData = await ordersResponse.json();
      if (!productsResponse.ok) throw new Error(productData.error || "Products could not be loaded");
      if (!ordersResponse.ok) throw new Error(orderData.error || "Orders could not be loaded");
      setProducts(productData.products ?? []);
      setOrders(orderData.orders ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Your store data could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const liveProducts = products.filter((product) => product.status === "published");
  const paidOrders = orders.filter((order) => order.payment_status === "paid");
  const revenue = paidOrders.reduce((sum, order) => sum + order.amount_total, 0);
  const averageOrder = paidOrders.length ? Math.round(revenue / paidOrders.length) : 0;
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.title} ${product.category}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === "all" || product.status === statusFilter);
  }), [products, search, statusFilter]);

  async function createUpload(file: File, type: "pdf" | "cover") {
    const response = await fetch("/api/admin/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: file.name, type }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Secure upload could not start");
    const { error } = await browserDb().storage
      .from(result.bucket)
      .uploadToSignedUrl(result.path, result.token, file, { contentType: file.type });
    if (error) throw error;
    return result.path as string;
  }

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setUploadProgress(5);
    setFormError("");
    try {
      const form = new FormData(event.currentTarget);
      const pdf = form.get("pdf") as File;
      const cover = form.get("cover") as File;
      if (!pdf?.size || pdf.type !== "application/pdf") throw new Error("Choose a valid PDF file");
      if (pdf.size > 200 * 1024 * 1024) throw new Error("The PDF must be 200 MB or smaller");
      if (cover?.size && !["image/jpeg", "image/png", "image/webp"].includes(cover.type)) throw new Error("The cover must be JPG, PNG or WebP");
      if (cover?.size > 10 * 1024 * 1024) throw new Error("The cover must be 10 MB or smaller");

      const pdfPath = await createUpload(pdf, "pdf");
      setUploadProgress(60);
      const coverPath = cover?.size ? await createUpload(cover, "cover") : null;
      setUploadProgress(85);
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          category: form.get("category"),
          price: form.get("price"),
          status: form.get("status"),
          pdfPath,
          pdfName: pdf.name,
          pdfSize: pdf.size,
          coverPath,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The product could not be saved");
      setUploadProgress(100);
      event.currentTarget.reset();
      setProductModal(false);
      await loadData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Upload failed");
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  }

  async function changeStatus(product: Product, status: "draft" | "published") {
    const response = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: product.id, status }),
    });
    const result = await response.json();
    if (!response.ok) return window.alert(result.error || "The product status could not be changed");
    await loadData();
  }

  async function archiveProduct(product: Product) {
    if (!window.confirm(`Archive “${product.title}”? It will disappear from your store but past orders will remain.`)) return;
    const response = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return window.alert(result.error || "The product could not be archived");
    await loadData();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  return (
    <main>
      <div className="page-glow" aria-hidden="true" />
      <header className="app-sidebar">
        <button className="brand" onClick={() => setSection("overview")}><span className="brand-mark">O</span>OfferFlow</button>
        <nav aria-label="Seller navigation">
          {nav.map((item) => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => { setSection(item.id); window.scrollTo({ top: 0 }); }}><span>{item.icon}</span>{item.label}</button>)}
        </nav>
        <div className="sidebar-account">
          <span className="avatar">SO</span>
          <span><strong>Store owner</strong><small>Production dashboard</small></span>
        </div>
      </header>

      {loadError && <section className="workspace-section app-view"><div className="library-panel"><h2>We could not load your store</h2><p>{loadError}</p><button onClick={loadData}>Try again</button></div></section>}

      {!loadError && section === "overview" && <section className="workspace-section app-view">
        <div className="section-heading compact">
          <div><p className="eyebrow">LIVE STORE OVERVIEW</p><h2>Your real products, orders and revenue.</h2></div>
          <p>No estimates or sample results are shown. Every figure below comes from your connected store.</p>
        </div>
        <div className="live-metrics">
          <article><span>Published products</span><strong>{loading ? "—" : liveProducts.length}</strong><small>{products.length - liveProducts.length} drafts</small></article>
          <article><span>Paid orders</span><strong>{loading ? "—" : paidOrders.length}</strong><small>Confirmed by Stripe</small></article>
          <article><span>Total revenue</span><strong>{loading ? "—" : money(revenue)}</strong><small>Successful payments</small></article>
          <article><span>Average order</span><strong>{loading ? "—" : money(averageOrder)}</strong><small>Across paid orders</small></article>
        </div>
        <div className="dashboard-production-grid">
          <div className="library-panel">
            <div className="panel-heading"><div><h3>Recent orders</h3><span>Your latest confirmed checkouts</span></div><button onClick={() => setSection("orders")}>View orders</button></div>
            {!paidOrders.length ? <div className="empty-state"><strong>No paid orders yet</strong><p>Orders will appear here after a customer completes Stripe Checkout.</p></div> :
              <div>{paidOrders.slice(0, 5).map((order) => <div className="production-list-row" key={order.id}><div><strong>{order.customer_email || "Customer email unavailable"}</strong><small>{new Date(order.created_at).toLocaleString("en-GB")}</small></div><b>{money(order.amount_total, order.currency)}</b></div>)}</div>}
          </div>
          <aside className="rights-panel">
            <div className="rights-icon">{liveProducts.length}</div>
            <p className="eyebrow">STORE STATUS</p>
            <h3>{liveProducts.length ? "Your customer store is live." : "Publish your first product."}</h3>
            <p>{liveProducts.length ? `${liveProducts.length} product${liveProducts.length === 1 ? "" : "s"} currently available to customers.` : "Upload a PDF and cover, review the listing and publish it when ready."}</p>
            <button onClick={() => setSection(liveProducts.length ? "store" : "products")}>{liveProducts.length ? "Open store tools →" : "Add a product →"}</button>
          </aside>
        </div>
      </section>}

      {!loadError && section === "products" && <section className="workspace-section app-view">
        <div className="section-heading compact">
          <div><p className="eyebrow">PRODUCT MANAGEMENT</p><h2>Upload, review and publish your ebooks.</h2></div>
          <p>PDFs remain private. Cover images appear publicly only when you publish a product.</p>
        </div>
        <div className="library-panel">
          <div className="panel-heading"><div><h3>Your products</h3><span>{products.length} active records</span></div><button onClick={() => { setFormError(""); setProductModal(true); }}>+ Add product</button></div>
          <div className="audit-toolbar">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or category…" aria-label="Search products" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter products"><option value="all">All statuses</option><option value="draft">Drafts</option><option value="published">Published</option></select>
          </div>
          {loading ? <div className="empty-state">Loading products…</div> : !filteredProducts.length ? <div className="empty-state"><strong>{products.length ? "No products match this filter" : "No products yet"}</strong><p>{products.length ? "Change the search or status filter." : "Select Add product to upload your first PDF."}</p></div> :
            <div className="production-table">
              <div className="production-table-head"><span>Product</span><span>Category</span><span>Price</span><span>Status</span><span>Actions</span></div>
              {filteredProducts.map((product) => <article className="production-product-row" key={product.id}>
                <div className="production-product-name">{product.cover_path ? <img src={`/api/products/${product.id}/cover`} alt="" /> : <span>PDF</span>}<div><strong>{product.title}</strong><small>{product.pdf_name} · {(product.pdf_size / 1024 / 1024).toFixed(1)} MB</small></div></div>
                <span>{product.category}</span><b>{money(product.price_pence)}</b><i className={product.status}>{product.status}</i>
                <div className="row-actions"><button onClick={() => changeStatus(product, product.status === "published" ? "draft" : "published")}>{product.status === "published" ? "Unpublish" : "Publish"}</button><button className="danger" onClick={() => archiveProduct(product)}>Archive</button></div>
              </article>)}
            </div>}
        </div>
      </section>}

      {!loadError && section === "orders" && <section className="workspace-section app-view">
        <div className="section-heading compact"><div><p className="eyebrow">ORDER MANAGEMENT</p><h2>Payments and purchased products.</h2></div><p>Orders are created automatically after Stripe confirms a completed checkout.</p></div>
        <div className="library-panel">
          <div className="panel-heading"><div><h3>Order history</h3><span>{orders.length} total orders</span></div><button onClick={loadData}>Refresh</button></div>
          {loading ? <div className="empty-state">Loading orders…</div> : !orders.length ? <div className="empty-state"><strong>No orders yet</strong><p>Your first successful Stripe checkout will appear here.</p></div> :
            <div className="order-list">{orders.map((order) => <article className="order-card" key={order.id}>
              <div><span className={`payment-dot ${order.payment_status}`} /><strong>{order.customer_email || "Email unavailable"}</strong><small>{new Date(order.created_at).toLocaleString("en-GB")}</small></div>
              <div className="order-products">{order.order_items?.map((item) => <span key={item.id}>{item.title}</span>)}</div>
              <div><b>{money(order.amount_total, order.currency)}</b><small>{order.payment_status}</small></div>
            </article>)}</div>}
        </div>
      </section>}

      {!loadError && section === "store" && <section className="store-section app-view">
        <div className="section-heading compact"><div><p className="eyebrow">CUSTOMER STOREFRONT</p><h2>Preview the products customers can buy.</h2></div><p>Only published products appear here. Open the public store in a separate tab to test the full buying journey.</p></div>
        <div className="store-preview-bar"><div><span className="preview-dot" />Live product visibility</div><a href="/store" target="_blank" rel="noreferrer">Open public store ↗</a></div>
        {!liveProducts.length ? <div className="library-panel empty-state"><strong>Your public store is empty</strong><p>Publish a product from the Products menu to make it available.</p><button onClick={() => setSection("products")}>Manage products</button></div> :
          <div className="store-products">{liveProducts.map((product) => <article className="store-card" key={product.id}><div className="store-cover"><span className="cover-badge">{product.category}</span>{product.cover_path ? <img className="customer-cover-image" src={`/api/products/${product.id}/cover`} alt={`${product.title} cover`} /> : <div className="book-stack"><i /><i /><strong>PDF</strong></div>}<small>{(product.pdf_size / 1024 / 1024).toFixed(1)} MB PDF</small></div><div className="store-card-content"><p>PUBLISHED PRODUCT</p><h3>{product.title}</h3><span>{product.description}</span><div className="store-price"><strong>{money(product.price_pence)}</strong><small>One-time payment</small></div></div></article>)}</div>}
      </section>}

      {!loadError && section === "settings" && <section className="workspace-section app-view">
        <div className="section-heading compact"><div><p className="eyebrow">STORE SETTINGS</p><h2>Production connections and access.</h2></div><p>Sensitive values remain protected in Vercel and are never displayed in the browser.</p></div>
        <div className="settings-grid">
          <article className="library-panel"><h3>Customer store</h3><p>Share this route with customers after you finish testing.</p><a className="settings-link" href="/store" target="_blank">Open `/store` ↗</a></article>
          <article className="library-panel"><h3>Payments</h3><p>Stripe Checkout becomes available when the secret key and webhook are configured in Vercel.</p><span className="status-note">Test every purchase before switching Stripe to live mode.</span></article>
          <article className="library-panel"><h3>Security</h3><p>The dashboard requires your admin password. PDFs remain in a private storage bucket.</p><button className="logout-button" onClick={logout}>Sign out</button></article>
        </div>
      </section>}

      {productModal && <div className="modal-backdrop" onMouseDown={() => !uploading && setProductModal(false)}>
        <form className="modal add-product-modal" onSubmit={addProduct} onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" className="modal-close" onClick={() => setProductModal(false)} disabled={uploading}>×</button>
          <p className="eyebrow">NEW PRODUCT</p><h2>Upload a digital product</h2><p>Add accurate customer-facing information. You can save it as a draft before publishing.</p>
          <label>Product title<input name="title" required maxLength={140} autoFocus /></label>
          <label>Description<textarea name="description" required rows={4} maxLength={800} /></label>
          <div className="upload-field-pair">
            <label>Category<select name="category">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Price (£)<input name="price" type="number" min=".50" max="9999" step=".01" required /></label>
          </div>
          <div className="upload-field-pair">
            <label className="file-field">PDF file<input name="pdf" type="file" accept="application/pdf" required /><span>Maximum 200 MB</span></label>
            <label className="file-field">Cover image<input name="cover" type="file" accept="image/jpeg,image/png,image/webp" /><span>Recommended 1600 × 2560 px · maximum 10 MB</span></label>
          </div>
          <label>Publishing<select name="status"><option value="draft">Save as draft</option><option value="published">Publish immediately</option></select></label>
          {uploadProgress > 0 && <div className="progress-track"><span style={{ width: `${uploadProgress}%` }} /></div>}
          {formError && <p className="upload-error">{formError}</p>}
          <button className="button primary" disabled={uploading}>{uploading ? `Uploading… ${uploadProgress}%` : "Save product"}</button>
        </form>
      </div>}
    </main>
  );
}
