"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { browserDb } from "@/lib/supabase";

type Section = "overview" | "products" | "campaigns" | "orders" | "store" | "settings";
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
type Campaign = {
  id: string; name: string; product_id: string; country: string; target_countries?: string[]; age_min: number; age_max: number;
  daily_budget_pence: number; duration_days: number; primary_text: string; headline: string;
  interest_ids: string[]; status: "draft" | "ready" | "paused" | "active" | "completed";
  meta_campaign_id: string | null; created_at: string;
  products: { id: string; title: string; status: string; cover_path: string | null } | null;
};
type MetaReadiness = { connected: boolean; required: Record<string, boolean>; missing: string[] };

const nav: Array<{ id: Section; icon: string; label: string }> = [
  { id: "overview", icon: "⌂", label: "Overview" },
  { id: "products", icon: "□", label: "Products" },
  { id: "campaigns", icon: "◉", label: "Campaigns" },
  { id: "orders", icon: "◎", label: "Orders" },
  { id: "store", icon: "▣", label: "Store" },
  { id: "settings", icon: "⚙", label: "Settings" },
];

const categories = [
  "UGC & Creator", "User Experience [UX]", "Digital Products", "Faceless Marketing", "Business",
  "Finance", "Social Media", "E-commerce", "Templates & Planners",
  "AI & Productivity", "Branding", "Marketing", "Family & Education",
];
const marketGroups = {
  "Recommended markets": [["US","United States"],["GB","United Kingdom"],["CA","Canada"],["AU","Australia"],["DE","Germany"],["NL","Netherlands"],["IE","Ireland"],["NZ","New Zealand"],["SG","Singapore"],["ZA","South Africa"]],
  "Additional markets": [["NG","Nigeria"],["GH","Ghana"],["IN","India"],["AE","UAE"],["FR","France"],["ES","Spain"],["BR","Brazil"],["JP","Japan"],["KR","South Korea"],["IT","Italy"],["MX","Mexico"]],
};

function money(pence: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(pence / 100);
}

export default function VendlixaDashboard() {
  const [section, setSection] = useState<Section>("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metaReadiness, setMetaReadiness] = useState<MetaReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [productModal, setProductModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaignModal, setCampaignModal] = useState(false);
  const [campaignBusy, setCampaignBusy] = useState("");
  const [campaignError, setCampaignError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [productsResponse, ordersResponse, campaignsResponse] = await Promise.all([
        fetch("/api/admin/products", { cache: "no-store" }),
        fetch("/api/admin/orders", { cache: "no-store" }),
        fetch("/api/admin/campaigns", { cache: "no-store" }),
      ]);
      if (productsResponse.status === 401 || ordersResponse.status === 401 || campaignsResponse.status === 401) {
        window.location.assign("/admin/login");
        return;
      }
      const productData = await productsResponse.json();
      const orderData = await ordersResponse.json();
      const campaignData = await campaignsResponse.json();
      if (!productsResponse.ok) throw new Error(productData.error || "Products could not be loaded");
      if (!ordersResponse.ok) throw new Error(orderData.error || "Orders could not be loaded");
      if (!campaignsResponse.ok) throw new Error(campaignData.error || "Campaigns could not be loaded. Run the latest Supabase production upgrade.");
      setProducts(productData.products ?? []);
      setOrders(orderData.orders ?? []);
      setCampaigns(campaignData.campaigns ?? []);
      setMetaReadiness(campaignData.meta ?? null);
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
    const formElement = event.currentTarget;
    setUploading(true);
    setUploadProgress(5);
    setFormError("");
    try {
      const form = new FormData(formElement);
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
      formElement.reset();
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

  async function addCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setCampaignBusy("create");
    setCampaignError("");
    try {
      const form = new FormData(formElement);
      const payload = Object.fromEntries(form.entries()) as Record<string, unknown>;
      payload.countries = form.getAll("countries");
      const response = await fetch("/api/admin/campaigns", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The campaign could not be saved");
      formElement.reset();
      setCampaignModal(false);
      await loadData();
      setSection("campaigns");
    } catch (error) {
      setCampaignError(error instanceof Error ? error.message : "Campaign creation failed");
    } finally { setCampaignBusy(""); }
  }

  async function launchCampaign(campaign: Campaign) {
    if (!window.confirm(`Send “${campaign.name}” to Meta as PAUSED? It will not spend until activated in Meta Ads Manager.`)) return;
    setCampaignBusy(campaign.id);
    setCampaignError("");
    try {
      const response = await fetch(`/api/admin/campaigns/${campaign.id}/launch`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Meta launch failed");
      await loadData();
      window.alert("Campaign created in Meta as PAUSED. Review it in Meta Ads Manager before activation.");
    } catch (error) {
      setCampaignError(error instanceof Error ? error.message : "Meta launch failed");
    } finally { setCampaignBusy(""); }
  }

  async function deleteCampaign(campaign: Campaign) {
    if (!window.confirm(`Delete campaign “${campaign.name}”?`)) return;
    setCampaignBusy(campaign.id);
    const response = await fetch(`/api/admin/campaigns?id=${encodeURIComponent(campaign.id)}`, { method: "DELETE" });
    const result = await response.json();
    setCampaignBusy("");
    if (!response.ok) return setCampaignError(result.error || "Campaign could not be deleted");
    await loadData();
  }

  return (
    <main>
      <div className="page-glow" aria-hidden="true" />
      <header className="app-sidebar">
        <button className="brand brand-lockup" onClick={() => setSection("overview")}><img src="/brand/vendlixa-mark.png" alt="" /><span>Vendlixa</span></button>
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

      {!loadError && section === "campaigns" && <section className="workspace-section app-view">
        <div className="section-heading compact">
          <div><p className="eyebrow">META SALES CAMPAIGNS</p><h2>Turn a published ebook into a targeted campaign.</h2></div>
          <p>Plan the audience, budget and ad copy here. Meta campaigns are created paused so you can review them before any spend.</p>
        </div>
        <div className="campaign-status-strip">
          <div className={metaReadiness?.connected ? "connected" : "setup"}>
            <span>{metaReadiness?.connected ? "✓" : "!"}</span>
            <div><strong>{metaReadiness?.connected ? "Meta launch connection ready" : "Meta connection needs setup"}</strong>
              <small>{metaReadiness?.connected ? "Credentials are stored securely on the server." : `Missing: ${metaReadiness?.missing?.join(", ") || "connection variables"}`}</small></div>
          </div>
          <button onClick={() => { setCampaignError(""); setCampaignModal(true); }} disabled={!liveProducts.length}>+ New campaign</button>
        </div>
        {campaignError && <p className="campaign-alert">{campaignError}</p>}
        {!liveProducts.length && <div className="library-panel empty-state"><strong>Publish a product first</strong><p>A campaign must lead to a product customers can buy.</p><button onClick={() => setSection("products")}>Manage products</button></div>}
        {!!liveProducts.length && !campaigns.length && <div className="library-panel empty-state"><strong>No campaigns yet</strong><p>Create a campaign to define its product, audience, budget and sales message.</p><button onClick={() => setCampaignModal(true)}>Create first campaign</button></div>}
        {!!campaigns.length && <div className="campaign-grid">
          {campaigns.map((campaign) => <article className="campaign-card" key={campaign.id}>
            <div className="campaign-card-top"><i className={campaign.status}>{campaign.status}</i><small>{new Date(campaign.created_at).toLocaleDateString("en-GB")}</small></div>
            <p>META · SALES</p><h3>{campaign.name}</h3>
            <strong className="campaign-product">{campaign.products?.title || "Product unavailable"}</strong>
            <div className="campaign-metrics">
              <span><small>Daily budget</small><b>{money(campaign.daily_budget_pence)}</b></span>
              <span><small>Total limit</small><b>{money(campaign.daily_budget_pence * campaign.duration_days)}</b></span>
              <span><small>Audience</small><b>{campaign.country} · {campaign.age_min}–{campaign.age_max}</b></span>
              <span><small>Duration</small><b>{campaign.duration_days} days</b></span>
            </div>
            <div className="campaign-copy"><small>AD PREVIEW</small><b>{campaign.headline}</b><p>{campaign.primary_text}</p></div>
            <div className="campaign-actions">
              {!campaign.meta_campaign_id && <button onClick={() => launchCampaign(campaign)} disabled={campaignBusy === campaign.id}>{campaignBusy === campaign.id ? "Sending…" : "Send to Meta (paused)"}</button>}
              {campaign.meta_campaign_id && <a href="https://adsmanager.facebook.com/" target="_blank" rel="noreferrer">Review in Ads Manager ↗</a>}
              <button className="danger" onClick={() => deleteCampaign(campaign)} disabled={campaignBusy === campaign.id || campaign.status === "active"}>Delete</button>
            </div>
          </article>)}
        </div>}
        <div className="campaign-safety">
          <strong>Safe launch workflow</strong>
          <span>1. Create draft</span><span>2. Send paused</span><span>3. Review tracking and creative in Meta</span><span>4. Activate in Ads Manager</span>
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
          <div className="store-products">{liveProducts.map((product) => <article className="store-card" key={product.id}><div className="store-cover"><span className="cover-badge">{product.category}</span>{product.cover_path ? <img className="customer-cover-image" src={`/api/products/${product.id}/cover`} alt={`${product.title} cover`} /> : <div className="book-stack"><i /><i /><strong>PDF</strong></div>}<small>{(product.pdf_size / 1024 / 1024).toFixed(1)} MB PDF</small><div className="store-cover-glance" aria-hidden="true"><span>QUICK GLANCE</span><strong>{product.title}</strong><p>{product.description}</p><b>{money(product.price_pence)}</b></div></div><div className="store-card-content"><p>PUBLISHED PRODUCT</p><h3>{product.title}</h3><span>{product.description}</span><div className="store-price"><strong>{money(product.price_pence)}</strong><small>One-time payment</small></div></div></article>)}</div>}
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

      {campaignModal && <div className="modal-backdrop" onMouseDown={() => !campaignBusy && setCampaignModal(false)}>
        <form className="modal campaign-modal" onSubmit={addCampaign} onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" className="modal-close" onClick={() => setCampaignModal(false)} disabled={Boolean(campaignBusy)}>×</button>
          <p className="eyebrow">NEW SALES CAMPAIGN</p><h2>Plan your Meta campaign</h2><p>The total budget shown is a planning limit. The Meta campaign will be created paused.</p>
          <label>Campaign name<input name="name" required maxLength={120} autoFocus placeholder="UGC Toolkit launch" /></label>
          <label>Published product<select name="productId" required defaultValue=""><option value="" disabled>Choose a product</option>{liveProducts.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}</select></label>
          <label>Targeting method<select name="countryMode" defaultValue="ai"><option value="ai">AI recommended (best markets for this ebook)</option><option value="custom">Choose countries myself</option></select><span className="field-help">AI analyses the ebook topic, audience, language and price, then selects the strongest markets.</span></label>
          <div className="market-groups">
            {Object.entries(marketGroups).map(([group, entries]) => <fieldset key={group}><legend>{group}</legend><div className="market-options">{entries.map(([code, label]) => <label key={code}><input type="checkbox" name="countries" value={code} />{label} ({code})</label>)}</div></fieldset>)}
          </div>
          <div className="upload-field-pair">
            <label>Fallback country<input name="country" defaultValue="GB" required pattern="[A-Za-z]{2}" maxLength={2} /></label>
            <label>Duration (days)<input name="durationDays" type="number" min="1" max="90" defaultValue="7" required /></label>
          </div>
          <div className="campaign-form-grid">
            <label>Minimum age<input name="ageMin" type="number" min="18" max="65" defaultValue="18" required /></label>
            <label>Maximum age<input name="ageMax" type="number" min="18" max="65" defaultValue="45" required /></label>
            <label>Daily budget (£)<input name="dailyBudget" type="number" min="1" max="10000" step=".01" defaultValue="10" required /></label>
          </div>
          <label>Primary ad text<textarea name="primaryText" rows={4} maxLength={500} required placeholder="Explain the result your ebook helps the customer achieve." /></label>
          <label>Headline<input name="headline" maxLength={100} required placeholder="Start landing your first UGC brand deal" /></label>
          <label>Meta interest IDs <span className="optional">(optional, comma separated)</span><input name="interestIds" inputMode="numeric" placeholder="6003139266461, 6003384248805" /><span className="field-help">Leave blank for a broad country-and-age audience. Use numeric IDs from Meta Audience tools only.</span></label>
          {campaignError && <p className="upload-error">{campaignError}</p>}
          <button className="button primary" disabled={Boolean(campaignBusy)}>{campaignBusy ? "Saving…" : "Save campaign draft"}</button>
        </form>
      </div>}
    </main>
  );
}
