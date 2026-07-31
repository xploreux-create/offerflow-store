"use client";

import { useEffect, useMemo, useState } from "react";
import { browserDb } from "@/lib/supabase";

type RightsStatus = "Unverified" | "Original" | "PLR licence" | "Resell rights";

const rawInventory: Array<[string, string]> = [
  ["UGC and Faceless Marketing", "UGC & Creator"],
  ["Faceless Digital Biz", "Faceless Marketing"],
  ["Faceless Marketing", "Faceless Marketing"],
  ["Faceless Digital Marketing", "Faceless Marketing"],
  ["Affiliate Marketing", "Affiliate & Influencer"],
  ["DM & Email Templates For Brands", "UGC & Creator"],
  ["Brand Contacts - 150 Emails", "UGC & Creator"],
  ["Selling with Amazon FBA", "E-commerce"],
  ["Using Influencers To Market", "Affiliate & Influencer"],
  ["The Wealth Guide", "Finance"],
  ["Side Income Handbook", "Business"],
  ["IG Growth Guide For Boss Babes", "Social Media"],
  ["Creative Content Bank", "Content Creation"],
  ["Financial Literacy Planner", "Finance"],
  ["Instagram Stories That Sell", "Social Media"],
  ["Digital Sales Mastery", "Digital Products"],
  ["How To Find Your Niche Workbook", "Digital Products"],
  ["Social Media Content Guide", "Social Media"],
  ["177 Digital Product Ideas", "Digital Products"],
  ["550 ChatGPT Prompts", "AI & Productivity"],
  ["Canva Crash Course", "Content Creation"],
  ["DIY Profile Audit", "Social Media"],
  ["The Art of Repurposing Content", "Content Creation"],
  ["Mastering Branding", "Branding"],
  ["Start A Vending Machine Business", "Business"],
  ["E-commerce Dropshipping", "E-commerce"],
  ["Become A Graphic Designer", "Skills & Careers"],
  ["Sales Funnel", "Digital Products"],
  ["Six Figure Business Playbook", "Business"],
  ["Business Plan Template", "Business"],
  ["Start A Business With No Money", "Business"],
  ["4 Weeks - Reels, Hooks, & Captions", "Social Media"],
  ["SEO Optimization - A Guide", "Marketing"],
  ["Mastering Instagram", "Social Media"],
  ["50k Followers in 90 days", "Social Media"],
  ["Beginners Social Media Challenge", "Social Media"],
  ["Becoming An Event Coordinator", "Skills & Careers"],
  ["Event Coordinator Toolkit", "Skills & Careers"],
  ["Social Media Influencer Playbook", "Affiliate & Influencer"],
  ["Media Kit Template", "UGC & Creator"],
  ["Create and Sell Digital Products", "Digital Products"],
  ["Promote Your Digital Products", "Digital Products"],
  ["4 Week Digital Product Launch", "Digital Products"],
  ["Credit Repair Ebook", "Finance"],
  ["Funding Your Business", "Finance"],
  ["Build Business Credit", "Finance"],
  ["Mastering Business Credit", "Finance"],
  ["Mastering Lash Enhancement", "Beauty"],
  ["Talking To Vendors", "E-commerce"],
  ["Back To School Alphabet", "Family & Education"],
  ["Homeschooling Guide", "Family & Education"],
  ["10 DIY Craft Ideas", "Family & Education"],
  ["Start Your Own Business With Turo", "Business"],
  ["DSA - 7500+ DFY 2026 Planners", "Templates & Planners"],
  ["Making Money with Digital PRODUCTS", "Digital Products"],
  ["2026 PLR Bundle", "Templates & Planners"],
  ["Selling with Amazon FBA", "E-commerce"],
  ["Faceless Digital Biz", "Faceless Marketing"],
  ["Affiliate Marketing", "Affiliate & Influencer"],
  ["Brand Contacts - 150 Emails", "UGC & Creator"],
  ["Using Influencers To Market", "Affiliate & Influencer"],
];

const highRiskTitles = new Set([
  "The Wealth Guide",
  "Six Figure Business Playbook",
  "50k Followers in 90 days",
  "Credit Repair Ebook",
  "Funding Your Business",
  "Build Business Credit",
  "Mastering Business Credit",
  "Making Money with Digital PRODUCTS",
]);

const titleCounts = rawInventory.reduce<Record<string, number>>((counts, [title]) => {
  counts[title] = (counts[title] ?? 0) + 1;
  return counts;
}, {});

const initialInventory = rawInventory.map(([title, category], index) => ({
  id: `${index}-${title}`,
  title,
  category,
  rights: "Unverified" as RightsStatus,
  duplicate: titleCounts[title] > 1,
  risk: highRiskTitles.has(title),
}));

const bundles = [
  {
    key: "ugc",
    eyebrow: "CREATOR INCOME",
    title: "UGC Brand Deal Toolkit",
    description: "Create content, approach brands and manage your first paid collaboration.",
    price: 29,
    accent: "lime",
    icon: "UGC",
    revenue: "£3,240",
    roas: "3.8x",
    orders: 112,
    books: 6,
  },
  {
    key: "faceless",
    eyebrow: "START WITHOUT A CAMERA",
    title: "Faceless Business Starter Kit",
    description: "Build and promote a digital-product business without becoming the face of it.",
    price: 27,
    accent: "coral",
    icon: "↗",
    revenue: "£4,950",
    roas: "4.2x",
    orders: 158,
    books: 6,
  },
  {
    key: "launch",
    eyebrow: "FROM IDEA TO CHECKOUT",
    title: "Digital Product Launch System",
    description: "Package one useful idea, create the offer and launch it with a four-week plan.",
    price: 39,
    accent: "violet",
    icon: "▥",
    revenue: "£6,630",
    roas: "2.9x",
    orders: 212,
    books: 6,
  },
];

const bundleContents: Record<string, string[]> = {
  ugc: ["UGC Creator Guide", "DM & Email Templates", "Media Kit Template", "Brand Contacts Directory", "Influencer Playbook", "Content Planner"],
  faceless: ["Faceless Digital Biz", "Faceless Marketing", "Niche Workbook", "177 Digital Product Ideas", "550 ChatGPT Prompts", "Reels, Hooks & Captions"],
  launch: ["Create and Sell Digital Products", "Digital Sales Mastery", "Four-Week Launch Plan", "Sales Funnel Guide", "Canva Crash Course", "Promotion Workbook"],
};

function Sparkline({ accent }: { accent: string }) {
  return (
    <svg className={`sparkline ${accent}`} viewBox="0 0 220 52" role="img" aria-label="Revenue rising over seven days">
      <path d="M3 43 C28 41, 31 31, 53 35 S83 20, 103 27 S135 11, 153 15 S184 7, 217 4" />
    </svg>
  );
}

export default function Home() {
  const [quizOpen, setQuizOpen] = useState(false);
  const [selected, setSelected] = useState("ugc");
  const [dailyBudget, setDailyBudget] = useState(12);
  const [campaignStatus, setCampaignStatus] = useState<"draft" | "ready">("draft");
  const [activeSection, setActiveSection] = useState<"overview" | "products" | "bundles" | "store" | "campaigns" | "analytics">("overview");
  const [inventory, setInventory] = useState(initialInventory);
  const [productSearch, setProductSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState<"all" | "review" | "duplicate" | "risk" | "cleared">("all");
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Digital Products");
  const [newRights, setNewRights] = useState<RightsStatus>("Unverified");
  const [newPrice, setNewPrice] = useState("19");
  const [newPdf, setNewPdf] = useState<File | null>(null);
  const [newCover, setNewCover] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "saved">("idle");
  const [uploadError, setUploadError] = useState("");
  const [cloudProducts, setCloudProducts] = useState<Array<{ id: string; title: string; category: string; rightsStatus: string; price: number; pdfName: string; pdfSize: number; coverName: string | null; status: string }>>([]);
  const [cart, setCart] = useState<string[]>([]);
  const [storeDetail, setStoreDetail] = useState<string | null>(null);
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading">("idle");
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("offerflow-product-audit");
    if (saved) {
      try {
        setInventory(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem("offerflow-product-audit");
      }
    }
    setAuditLoaded(true);
  }, []);

  useEffect(() => {
    if (auditLoaded) window.localStorage.setItem("offerflow-product-audit", JSON.stringify(inventory));
  }, [inventory, auditLoaded]);

  useEffect(() => {
    if (activeSection !== "products" && activeSection !== "store") return;
    fetch("/api/admin/products")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load secure uploads")))
      .then((data) => {
        const uploaded = (data.products ?? []).map((product: {
          id: string; title: string; category: string; price_pence: number;
          pdf_name: string; pdf_size: number; cover_path: string | null; status: string;
        }) => ({
          id: product.id,
          title: product.title,
          category: product.category,
          rightsStatus: "Original",
          price: product.price_pence / 100,
          pdfName: product.pdf_name,
          pdfSize: product.pdf_size,
          coverName: product.cover_path,
          status: product.status,
        })) as typeof cloudProducts;
        setCloudProducts(uploaded);
        setInventory((current) => {
          const uploadedIds = new Set(uploaded.map((product) => product.id));
          const savedUploads = uploaded.map((product) => ({
            id: product.id,
            title: product.title,
            category: product.category,
            rights: product.rightsStatus as RightsStatus,
            duplicate: current.some((item) => item.id !== product.id && item.title.toLowerCase() === product.title.toLowerCase()),
            risk: false,
          }));
          return [...savedUploads, ...current.filter((product) => !uploadedIds.has(product.id))];
        });
      })
      .catch(() => undefined);
  }, [activeSection]);

  const filteredInventory = useMemo(() => inventory.filter((product) => {
    const matchesSearch = `${product.title} ${product.category}`.toLowerCase().includes(productSearch.toLowerCase());
    const matchesFilter =
      auditFilter === "all" ||
      (auditFilter === "review" && product.rights === "Unverified") ||
      (auditFilter === "duplicate" && product.duplicate) ||
      (auditFilter === "risk" && product.risk) ||
      (auditFilter === "cleared" && product.rights !== "Unverified");
    return matchesSearch && matchesFilter;
  }), [inventory, productSearch, auditFilter]);

  const auditCounts = useMemo(() => ({
    total: inventory.length,
    cleared: inventory.filter((product) => product.rights !== "Unverified").length,
    review: inventory.filter((product) => product.rights === "Unverified").length,
    duplicates: inventory.filter((product) => product.duplicate).length,
    risk: inventory.filter((product) => product.risk).length,
  }), [inventory]);

  const updateRights = (id: string, rights: RightsStatus) => {
    setInventory((current) => current.map((product) => product.id === id ? { ...product, rights } : product));
  };

  const updateProductStatus = async (id: string, status: "draft" | "published") => {
    const response = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const result = await response.json() as { status?: string; error?: string };
    if (!response.ok) {
      window.alert(result.error ?? "Unable to update this product.");
      return false;
    }
    setCloudProducts((current) => current.map((product) => product.id === id ? { ...product, status: result.status ?? status } : product));
    return true;
  };

  const addProduct = async () => {
    const cleanTitle = newTitle.trim();
    if (!cleanTitle || !newPdf || uploadState === "uploading") return;
    if (newPdf.type !== "application/pdf" || newPdf.size > 200 * 1024 * 1024) {
      setUploadError("Choose a valid PDF no larger than 200 MB.");
      return;
    }
    if (newCover && (!["image/jpeg", "image/png", "image/webp"].includes(newCover.type) || newCover.size > 8 * 1024 * 1024)) {
      setUploadError("Choose a JPG, PNG or WebP cover no larger than 8 MB.");
      return;
    }
    setUploadState("uploading");
    setUploadError("");
    try {
      const uploadFile = async (file: File, kind: "pdf" | "cover") => {
        const signedResponse = await fetch("/api/admin/upload-url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fileName: file.name, type: kind }),
        });
        const signed = await signedResponse.json() as { bucket?: string; path?: string; token?: string; error?: string };
        if (!signedResponse.ok || !signed.bucket || !signed.path || !signed.token) {
          throw new Error(signed.error ?? "Secure upload could not start.");
        }
        const { error } = await browserDb().storage
          .from(signed.bucket)
          .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
        if (error) throw error;
        return { key: signed.path, name: file.name, size: file.size };
      };

      const pdfUpload = await uploadFile(newPdf, "pdf");
      const coverUpload = newCover ? await uploadFile(newCover, "cover") : null;
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          description: "Instant-access PDF guide from the Digital Skills Library.",
          category: newCategory,
          price: newPrice,
          pdfPath: pdfUpload.key,
          pdfName: pdfUpload.name,
          pdfSize: pdfUpload.size,
          coverPath: coverUpload?.key ?? null,
          status: newRights === "Unverified" ? "draft" : "published",
        }),
      });
      const responseText = await response.text();
      let result: { product?: (typeof cloudProducts)[number]; error?: string };
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(response.ok ? "The server returned an unreadable response." : `Upload failed (${response.status}). Please try again.`);
      }
      if (!response.ok) throw new Error(result.error ?? "Upload failed");
      if (!result.product) throw new Error("The product was uploaded but its saved record was not returned.");
      const savedProduct = result.product as unknown as {
        id: string; title: string; category: string; price_pence: number;
        pdf_name: string; pdf_size: number; cover_path: string | null; status: string;
      };
      const displayProduct = {
        id: savedProduct.id, title: savedProduct.title, category: savedProduct.category,
        rightsStatus: newRights, price: savedProduct.price_pence / 100,
        pdfName: savedProduct.pdf_name, pdfSize: savedProduct.pdf_size,
        coverName: savedProduct.cover_path, status: savedProduct.status,
      };
      setCloudProducts((current) => [displayProduct, ...current]);
      setInventory((current) => [
        {
          id: displayProduct.id,
          title: cleanTitle,
          category: newCategory,
          rights: newRights,
          duplicate: current.some((product) => product.title.toLowerCase() === cleanTitle.toLowerCase()),
          risk: false,
        },
        ...current,
      ]);
      setUploadState("saved");
      setTimeout(() => {
        setNewTitle("");
        setNewCategory("Digital Products");
        setNewRights("Unverified");
        setNewPrice("19");
        setNewPdf(null);
        setNewCover(null);
        setUploadState("idle");
        setAddProductOpen(false);
      }, 650);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
      setUploadState("idle");
    }
  };

  const addToCart = (key: string) => {
    setCart((current) => current.includes(key) ? current : [...current, key]);
  };

  const cartBundles = bundles.filter((bundle) => cart.includes(bundle.key));
  const cartCloudProducts = cloudProducts.filter((product) => cart.includes(`product:${product.id}`));
  const cartTotal = cartBundles.reduce((sum, bundle) => sum + bundle.price, 0) +
    cartCloudProducts.reduce((sum, product) => sum + Number(product.price), 0);

  const startCheckout = async () => {
    if (!cartCloudProducts.length || checkoutState === "loading") return;
    setCheckoutState("loading");
    setCheckoutError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productIds: cartCloudProducts.map((product) => product.id) }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Checkout could not start.");
      window.location.assign(result.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Checkout could not start.");
      setCheckoutState("idle");
    }
  };

  const showSection = (section: typeof activeSection) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main>
      <div className="page-glow" aria-hidden="true" />
      <header className="app-sidebar">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="OfferFlow home">
          <span className="brand-mark">O</span>OfferFlow
        </button>
        <nav aria-label="Primary navigation">
          <button className={activeSection === "overview" ? "active" : ""} onClick={() => showSection("overview")}><span>⌂</span>Overview</button>
          <button className={activeSection === "products" ? "active" : ""} onClick={() => showSection("products")}><span>□</span>Products</button>
          <button className={activeSection === "bundles" ? "active" : ""} onClick={() => showSection("bundles")}><span>◇</span>Bundles</button>
          <button className={activeSection === "store" ? "active" : ""} onClick={() => showSection("store")}><span>▣</span>Store</button>
          <button className={activeSection === "campaigns" ? "active" : ""} onClick={() => showSection("campaigns")}><span>◉</span>Campaigns</button>
          <button className={activeSection === "analytics" ? "active" : ""} onClick={() => showSection("analytics")}><span>↗</span>Analytics</button>
        </nav>
        <div className="sidebar-account">
          <button className="avatar" aria-label="Open account menu">SO</button>
          <span><strong>Susan Ocha</strong><small>Store owner</small></span>
        </div>
      </header>

      {activeSection === "overview" && <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">SMARTER DIGITAL PRODUCT SALES</p>
          <h1 id="hero-title">Turn your ebooks into focused offers people want to buy.</h1>
          <p className="hero-text">Bundle, promote and track your digital products from one clear dashboard.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => setQuizOpen(true)}>Build my first offer <span>→</span></button>
            <button className="button secondary" onClick={() => showSection("bundles")}>View bundles</button>
          </div>
          <div className="trust-row">
            <span>✓ Licence checks</span>
            <span>✓ Budget controls</span>
            <span>✓ Profit-first reporting</span>
          </div>
        </div>

        <div className="dashboard-shell" id="analytics">
          <aside className="side-rail" aria-label="Dashboard sections">
            <div className="rail-logo">OF</div>
            {["⌂", "□", "◇", "◉", "↗"].map((item, index) => <span className={index === 0 ? "active" : ""} key={item}>{item}</span>)}
          </aside>
          <div className="dashboard">
            <div className="dashboard-heading">
              <div>
                <p className="mini-label">PERFORMANCE</p>
                <h2>Offer overview</h2>
              </div>
              <button className="date-chip">Last 30 days⌄</button>
            </div>
            <div className="metrics">
              <div><span>Total revenue</span><strong>£14,820</strong><small>↑ 18.6%</small></div>
              <div><span>Total orders</span><strong>482</strong><small>↑ 14.3%</small></div>
              <div><span>Average ROAS</span><strong>3.6x</strong><small>↑ 0.6x</small></div>
              <div><span>Active bundles</span><strong>3</strong><small>All healthy</small></div>
            </div>
            <div className="dashboard-label"><strong>Top bundles</strong><span>View all →</span></div>
            <div className="mini-bundles">
              {bundles.map((bundle) => (
                <button className={`mini-card ${bundle.accent}`} key={bundle.key} onClick={() => { setSelected(bundle.key); showSection("bundles"); }}>
                  <div className="mini-art"><span>{bundle.icon}</span></div>
                  <div className="mini-content">
                    <h3>{bundle.title}</h3>
                    <div className="mini-stats"><span>Revenue<strong>{bundle.revenue}</strong></span><span>ROAS<strong>{bundle.roas}</strong></span></div>
                    <Sparkline accent={bundle.accent} />
                    <div className="orders"><span>{bundle.orders} orders</span><span>↑ 19.7%</span></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>}

      {activeSection === "bundles" && <section className="bundle-section app-view" id="bundles">
        <div className="section-heading">
          <div><p className="eyebrow">YOUR FIRST THREE OFFERS</p><h2>Sell a result, not a folder of PDFs.</h2></div>
          <p>Each bundle solves one clear problem for one clear customer, making your adverts and sales pages easier to understand.</p>
        </div>
        <div className="bundle-grid">
          {bundles.map((bundle) => (
            <article className={`bundle-card ${bundle.accent} ${selected === bundle.key ? "selected" : ""}`} key={bundle.key}>
              <div className="bundle-top"><span className="bundle-icon">{bundle.icon}</span><span>{bundle.books} RESOURCES</span></div>
              <p className="bundle-eyebrow">{bundle.eyebrow}</p>
              <h3>{bundle.title}</h3>
              <p>{bundle.description}</p>
              <div className="bundle-bottom"><strong>£{bundle.price}</strong><button onClick={() => setSelected(bundle.key)}>Select offer →</button></div>
            </article>
          ))}
        </div>
      </section>}

      {activeSection === "store" && <section className="store-section app-view" aria-labelledby="store-title">
        <div className="store-preview-bar">
          <div><span className="preview-dot" />Customer storefront preview</div>
          <span>Checkout test mode</span>
        </div>
        <div className="store-hero">
          <div>
            <p className="eyebrow">DIGITAL SKILLS LIBRARY</p>
            <h2 id="store-title">Practical guides to help you create, market and sell online.</h2>
            <p>Choose a focused toolkit and follow a clear path from idea to action. Instant PDF access will be provided after secure payment.</p>
          </div>
          <div className="store-basket-summary">
            <span>YOUR BASKET</span>
            <strong>{cart.length}</strong>
            <small>{cart.length === 1 ? "item" : "items"}</small>
          </div>
        </div>
        <div className="store-layout">
          <div className="store-products">
            {bundles.map((bundle) => (
              <article className={`store-card ${bundle.accent}`} key={bundle.key}>
                <div className="store-cover">
                  <span className="cover-badge">{bundle.eyebrow}</span>
                  <div className="book-stack"><i /><i /><strong>{bundle.icon}</strong></div>
                  <small>{bundle.books} practical resources</small>
                </div>
                <div className="store-card-content">
                  <p>BEST FOR {bundle.key === "ugc" ? "NEW CREATORS" : bundle.key === "faceless" ? "FACELESS FOUNDERS" : "DIGITAL SELLERS"}</p>
                  <h3>{bundle.title}</h3>
                  <span>{bundle.description}</span>
                  <div className="store-price"><strong>£{bundle.price}</strong><small>One-time payment</small></div>
                  <div className="store-card-actions">
                    <button className="details-button" onClick={() => setStoreDetail(bundle.key)}>View details</button>
                    <button className="add-button" onClick={() => addToCart(bundle.key)}>{cart.includes(bundle.key) ? "Added ✓" : "Add to basket"}</button>
                  </div>
                </div>
              </article>
            ))}
            {cloudProducts.map((product, index) => {
              const cartKey = `product:${product.id}`;
              const accent = ["lime", "coral", "violet"][index % 3];
              return (
                <article className={`store-card ${accent}`} key={product.id}>
                  <div className="store-cover">
                    <span className="cover-badge">{product.category.toUpperCase()}</span>
                    {product.coverName
                      ? <img className="customer-cover-image" src={`/api/products/${product.id}/cover`} alt={`${product.title} cover`} />
                      : <div className="book-stack"><i /><i /><strong>PDF</strong></div>}
                    <small>{(product.pdfSize / 1024 / 1024).toFixed(1)} MB digital ebook</small>
                  </div>
                  <div className="store-card-content">
                    <p>NEW DIGITAL PRODUCT</p>
                    <h3>{product.title}</h3>
                    <span>Instant-access PDF guide from the Digital Skills Library.</span>
                    <div className="store-price"><strong>£{Number(product.price).toFixed(2)}</strong><small>One-time payment</small></div>
                    <div className="store-card-actions">
                      <button className="details-button" disabled>{product.status === "published" ? "Available now" : product.status === "blocked" ? "Rights review needed" : "Draft preview"}</button>
                      <button
                        className="add-button"
                        disabled={product.status === "blocked"}
                        onClick={async () => {
                          if (product.status !== "published") {
                            await updateProductStatus(product.id, "published");
                            return;
                          }
                          addToCart(cartKey);
                        }}
                      >
                        {product.status === "blocked" ? "Confirm rights first" : product.status !== "published" ? "Publish to sell" : cart.includes(cartKey) ? "Added ✓" : "Add to basket"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <aside className="basket-panel">
            <div className="basket-heading"><div><p className="eyebrow">YOUR ORDER</p><h3>Basket</h3></div><span>{cart.length}</span></div>
            {cartBundles.length === 0 && cartCloudProducts.length === 0 ? (
              <div className="empty-basket"><div>▣</div><strong>Your basket is empty</strong><p>Add a toolkit to prepare a test checkout.</p></div>
            ) : (
              <div className="basket-items">
                {cartBundles.map((bundle) => (
                  <div className="basket-item" key={bundle.key}>
                    <span className={bundle.accent}>{bundle.icon}</span>
                    <div><strong>{bundle.title}</strong><small>PDF bundle</small></div>
                    <div><b>£{bundle.price}</b><button onClick={() => setCart((current) => current.filter((key) => key !== bundle.key))}>Remove</button></div>
                  </div>
                ))}
                {cartCloudProducts.map((product) => (
                  <div className="basket-item" key={product.id}>
                    <span className="lime">PDF</span>
                    <div><strong>{product.title}</strong><small>Digital ebook</small></div>
                    <div><b>£{Number(product.price).toFixed(2)}</b><button onClick={() => setCart((current) => current.filter((key) => key !== `product:${product.id}`))}>Remove</button></div>
                  </div>
                ))}
              </div>
            )}
            <div className="basket-total"><span>Total</span><strong>£{cartTotal}</strong></div>
            {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
            <button className="checkout-button" disabled={!cartCloudProducts.length || checkoutState === "loading"} onClick={startCheckout}>
              {checkoutState === "loading" ? "Opening secure checkout…" : cartCloudProducts.length ? "Complete purchase" : "Add a published product"}
            </button>
            <div className="checkout-trust"><span>Secure checkout</span><span>Automatic PDF delivery</span><span>Order confirmation email</span></div>
          </aside>
        </div>
        <div className="store-benefits">
          <span><strong>Instant access</strong><small>Secure downloads after payment</small></span>
          <span><strong>Focused toolkits</strong><small>Related guides packaged together</small></span>
          <span><strong>Practical resources</strong><small>Templates, workbooks and action plans</small></span>
        </div>
      </section>}

      {activeSection === "products" && <section className="workspace-section app-view" id="products">
        <div className="section-heading compact">
          <div><p className="eyebrow">STAGE 1 · PRODUCT AUDIT</p><h2>Know what you can sell before you promote it.</h2></div>
          <p>Your catalogue is now organised for review. Confirm the rights for each product, resolve duplicate listings and review sensitive marketing claims.</p>
        </div>
        <div className="audit-stats" aria-label="Audit summary">
          <button className={auditFilter === "all" ? "active" : ""} onClick={() => setAuditFilter("all")}><span>Total products</span><strong>{auditCounts.total}</strong></button>
          <button className={auditFilter === "review" ? "active" : ""} onClick={() => setAuditFilter("review")}><span>Need rights review</span><strong>{auditCounts.review}</strong></button>
          <button className={auditFilter === "duplicate" ? "active" : ""} onClick={() => setAuditFilter("duplicate")}><span>Duplicate entries</span><strong>{auditCounts.duplicates}</strong></button>
          <button className={auditFilter === "risk" ? "active" : ""} onClick={() => setAuditFilter("risk")}><span>Claims to review</span><strong>{auditCounts.risk}</strong></button>
          <button className={auditFilter === "cleared" ? "active" : ""} onClick={() => setAuditFilter("cleared")}><span>Cleared</span><strong>{auditCounts.cleared}</strong></button>
        </div>
        <div className="secure-upload-panel">
          <div>
            <span className="secure-upload-icon">↥</span>
            <div><strong>Secure product storage</strong><small>{cloudProducts.length} uploaded {cloudProducts.length === 1 ? "product" : "products"} stored for your shop</small></div>
          </div>
          <div className="storage-badges"><span>PDF up to 200 MB</span><span>Private files</span><span>Cover up to 8 MB</span></div>
          <button onClick={() => setAddProductOpen(true)}>Upload product</button>
        </div>
        {cloudProducts.length > 0 && <div className="uploaded-products">
          {cloudProducts.map((product) => (
            <article key={product.id}>
              {product.coverName
                ? <img className="uploaded-cover-thumb" src={`/api/products/${product.id}/cover`} alt={`${product.title} cover`} />
                : <span className="uploaded-file-icon">PDF</span>}
              <div><strong>{product.title}</strong><small>{product.pdfName} · {(product.pdfSize / 1024 / 1024).toFixed(1)} MB</small></div>
              <span>£{Number(product.price).toFixed(2)}</span>
              <button
                className={product.status === "published" ? "status-action published" : "status-action"}
                disabled={product.status === "blocked"}
                onClick={() => updateProductStatus(product.id, product.status === "published" ? "draft" : "published")}
              >
                {product.status === "blocked" ? "Rights review" : product.status === "published" ? "Published ✓" : "Publish"}
              </button>
            </article>
          ))}
        </div>}
        <div className="workspace-grid audit-layout">
          <div className="library-panel">
            <div className="panel-heading">
              <div><h3>Ebook inventory</h3><span>{filteredInventory.length} products shown · {auditCounts.review} still blocked</span></div>
              <button onClick={() => setAddProductOpen(true)}>+ Upload product</button>
            </div>
            <div className="audit-toolbar">
              <label><span className="sr-only">Search products</span><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search title or category…" /></label>
              <select value={auditFilter} onChange={(event) => setAuditFilter(event.target.value as typeof auditFilter)} aria-label="Filter products">
                <option value="all">All products</option>
                <option value="review">Needs rights review</option>
                <option value="duplicate">Duplicates</option>
                <option value="risk">Claims to review</option>
                <option value="cleared">Cleared</option>
              </select>
            </div>
            <div className="product-table" role="table" aria-label="Digital products">
              <div className="table-row audit-head" role="row"><span>Product</span><span>Category</span><span>Rights</span><span>Checks</span><span>Status</span></div>
              <div className="audit-table-body">
              {filteredInventory.map((product) => (
                <div className="table-row audit-row" role="row" key={product.id}>
                  <strong>{product.title}</strong>
                  <span>{product.category}</span>
                  <select value={product.rights} onChange={(event) => updateRights(product.id, event.target.value as RightsStatus)} aria-label={`Rights for ${product.title}`}>
                    <option>Unverified</option>
                    <option>Original</option>
                    <option>PLR licence</option>
                    <option>Resell rights</option>
                  </select>
                  <span className="issue-tags">
                    {product.duplicate && <i>Duplicate</i>}
                    {product.risk && <i className="risk">Claims</i>}
                    {!product.duplicate && !product.risk && <small>—</small>}
                  </span>
                  <b className={product.rights === "Unverified" ? "blocked" : "ready"}>{product.rights === "Unverified" ? "Blocked" : "Cleared"}</b>
                </div>
              ))}
              {filteredInventory.length === 0 && <div className="empty-state">No products match this search or filter.</div>}
              </div>
            </div>
          </div>

          <aside className="rights-panel">
            <div className="rights-icon">{auditCounts.review === 0 ? "✓" : auditCounts.review}</div>
            <p className="eyebrow">AUDIT PROGRESS</p>
            <h3>{auditCounts.review === 0 ? "Your catalogue is cleared." : "Confirm the rights before launch."}</h3>
            <p>Select the correct rights status for every ebook. Designing a PDF in Canva confirms the layout, but licensed source content still needs its PLR or resale permission recorded.</p>
            <div className="progress-track"><span style={{ width: `${Math.round((auditCounts.cleared / auditCounts.total) * 100)}%` }} /></div>
            <strong className="progress-label">{auditCounts.cleared} of {auditCounts.total} checked</strong>
            <div className="check-list"><span>✓ Original writing and design</span><span>✓ PLR licence available</span><span>✓ Resale and bundling permitted</span></div>
            <button onClick={() => setAuditFilter("review")}>Review unchecked products →</button>
          </aside>
        </div>
      </section>}

      {activeSection === "campaigns" && <section className="campaign-section app-view" id="campaigns">
        <div className="campaign-copy">
          <p className="eyebrow">META CAMPAIGN PLANNER</p>
          <h2>Give every pound a clear job.</h2>
          <p>Create a controlled sales campaign around one bundle. OfferFlow calculates the test limit and prepares the audience, creative and tracking checklist.</p>
          <div className="campaign-rule"><span>Safety rule</span><strong>Pause after £{dailyBudget * 2} spend without a sale</strong></div>
          <div className="campaign-rule"><span>Optimisation</span><strong>Completed purchase — not clicks</strong></div>
          <div className="campaign-rule"><span>Tracking</span><strong>Meta Pixel + Conversions API</strong></div>
        </div>
        <div className="campaign-builder">
          <div className="builder-top"><div><p className="mini-label">NEW CAMPAIGN</p><h3>Test one focused offer</h3></div><span className={`draft-pill ${campaignStatus}`}>{campaignStatus === "draft" ? "DRAFT" : "READY TO REVIEW"}</span></div>
          <label>Offer
            <select value={selected} onChange={(event) => { setSelected(event.target.value); setCampaignStatus("draft"); }}>
              {bundles.map((bundle) => <option value={bundle.key} key={bundle.key}>{bundle.title}</option>)}
            </select>
          </label>
          <div className="field-pair">
            <label>Daily test budget
              <div className="money-input"><span>£</span><input type="number" min="5" max="100" value={dailyBudget} onChange={(event) => { setDailyBudget(Number(event.target.value)); setCampaignStatus("draft"); }} /></div>
            </label>
            <label>Campaign goal
              <select><option>Completed purchases</option></select>
            </label>
          </div>
          <div className="audience-box"><div><span>Suggested audience</span><strong>UK creators and aspiring digital sellers</strong></div><button>Edit</button></div>
          <div className="budget-summary"><span>7-day test budget<strong>£{dailyBudget * 7}</strong></span><span>Maximum no-sale spend<strong>£{dailyBudget * 2}</strong></span><span>Target cost per sale<strong>Under £8</strong></span></div>
          <button className="button primary builder-cta" onClick={() => setCampaignStatus("ready")}>{campaignStatus === "draft" ? "Prepare campaign draft" : "Campaign draft prepared ✓"}</button>
          <p className="builder-note">No advert is published and no money is spent without your approval.</p>
        </div>
      </section>}

      {activeSection === "analytics" && <section className="profit-section app-view">
        <div><p className="eyebrow">PROFIT-FIRST REPORTING</p><h2>See what you keep, not only what you sell.</h2></div>
        <div className="analytics-summary">
          <span>Reporting period<strong>Last 30 days</strong></span>
          <span>Best-performing offer<strong>Faceless Business Starter Kit</strong></span>
          <span>Average ROAS<strong>3.6x</strong></span>
        </div>
        <div className="profit-cards">
          <article><span>Revenue</span><strong>£1,480</strong><small>82 orders</small></article>
          <article><span>Ad spend</span><strong>− £392</strong><small>26.5% of revenue</small></article>
          <article className="featured"><span>Estimated profit</span><strong>£921</strong><small>After fees and adverts</small></article>
          <article><span>Cost per sale</span><strong>£4.78</strong><small>Target: under £8</small></article>
        </div>
      </section>}

      {addProductOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setAddProductOpen(false)}>
          <section className="modal add-product-modal" role="dialog" aria-modal="true" aria-labelledby="add-product-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setAddProductOpen(false)} aria-label="Close">×</button>
            <p className="eyebrow">PRODUCT AUDIT</p>
            <h2 id="add-product-title">Upload an ebook</h2>
            <p>Add the product information, private PDF and cover. Unverified products remain blocked from publishing.</p>
            <label>Product title<input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Enter the ebook title" autoFocus /></label>
            <div className="upload-field-pair">
              <label>Category
                <select value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>
                  {Array.from(new Set(initialInventory.map((product) => product.category))).sort().map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label>Price (£)<input type="number" min="0" step="0.01" value={newPrice} onChange={(event) => setNewPrice(event.target.value)} /></label>
            </div>
            <label>Rights status
              <select value={newRights} onChange={(event) => setNewRights(event.target.value as RightsStatus)}>
                <option>Unverified</option><option>Original</option><option>PLR licence</option><option>Resell rights</option>
              </select>
            </label>
            <div className="upload-field-pair">
              <label className="file-field">PDF file <input type="file" accept="application/pdf" onChange={(event) => setNewPdf(event.target.files?.[0] ?? null)} /><span>{newPdf ? `${newPdf.name} · ${(newPdf.size / 1024 / 1024).toFixed(1)} MB` : "Choose a PDF · maximum 200 MB"}</span></label>
              <label className="file-field">Cover image <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setNewCover(event.target.files?.[0] ?? null)} /><span>{newCover ? newCover.name : "Recommended: 1600 × 2560 px · JPG, PNG or WebP · maximum 8 MB"}</span></label>
            </div>
            {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
            <button className="button primary" onClick={addProduct} disabled={!newTitle.trim() || !newPdf || uploadState === "uploading"}>
              {uploadState === "uploading" ? "Uploading securely…" : uploadState === "saved" ? "Product saved ✓" : "Save product"}
            </button>
          </section>
        </div>
      )}

      {storeDetail && (() => {
        const bundle = bundles.find((item) => item.key === storeDetail)!;
        return (
          <div className="modal-backdrop" role="presentation" onMouseDown={() => setStoreDetail(null)}>
            <section className="modal store-detail-modal" role="dialog" aria-modal="true" aria-labelledby="store-detail-title" onMouseDown={(event) => event.stopPropagation()}>
              <button className="modal-close" onClick={() => setStoreDetail(null)} aria-label="Close">×</button>
              <span className={`detail-icon ${bundle.accent}`}>{bundle.icon}</span>
              <p className="eyebrow">{bundle.eyebrow}</p>
              <h2 id="store-detail-title">{bundle.title}</h2>
              <p>{bundle.description}</p>
              <h3>What’s included</h3>
              <ul>{bundleContents[bundle.key].map((item) => <li key={item}>✓ {item}</li>)}</ul>
              <div className="detail-purchase"><div><strong>£{bundle.price}</strong><small>One-time payment</small></div><button className="button primary" onClick={() => { addToCart(bundle.key); setStoreDetail(null); }}>Add to basket</button></div>
            </section>
          </div>
        );
      })()}

      {quizOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setQuizOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="quiz-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setQuizOpen(false)} aria-label="Close">×</button>
            <p className="eyebrow">OFFER FINDER</p>
            <h2 id="quiz-title">What would you most like to sell?</h2>
            <p>Choose the closest option. You can change the recommendation later.</p>
            <div className="quiz-options">
              {bundles.map((bundle) => (
                <button key={bundle.key} onClick={() => { setSelected(bundle.key); setQuizOpen(false); setActiveSection("bundles"); window.scrollTo({ top: 0 }); }}>
                  <span>{bundle.icon}</span><strong>{bundle.title}</strong><small>{bundle.description}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
