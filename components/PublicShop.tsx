"use client";

import { useMemo, useState } from "react";

type Product = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  pdfSize: number;
  coverUrl: string | null;
};

export default function PublicShop({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading">("idle");
  const [checkoutError, setCheckoutError] = useState("");

  const categories = ["All", ...Array.from(new Set(products.map((product) => product.category))).sort()];
  const visibleProducts = useMemo(() => products.filter((product) =>
    (category === "All" || product.category === category) &&
    `${product.title} ${product.description}`.toLowerCase().includes(search.toLowerCase())
  ), [products, category, search]);
  const basketProducts = products.filter((product) => cart.includes(product.id));
  const total = basketProducts.reduce((sum, product) => sum + product.price, 0);

  const addToBasket = (id: string) => {
    setCart((current) => current.includes(id) ? current : [...current, id]);
  };

  const startCheckout = async () => {
    if (!cart.length || checkoutState === "loading") return;
    setCheckoutState("loading");
    setCheckoutError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productIds: cart }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Checkout could not start.");
      window.location.assign(result.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Checkout could not start.");
      setCheckoutState("idle");
    }
  };

  return (
    <main>
      <div className="page-glow" aria-hidden="true" />
      <header className="app-sidebar">
        <a className="brand" href="/store"><span className="brand-mark">O</span>OfferFlow</a>
        <nav aria-label="Shop navigation">
          <a className="public-nav-link active" href="#shop"><span>▣</span>Shop</a>
          <a className="public-nav-link" href="#benefits"><span>✓</span>How it works</a>
          <a className="public-nav-link" href="mailto:support@example.com"><span>?</span>Support</a>
        </nav>
        <div className="sidebar-account">
          <span className="avatar">OF</span>
          <span><strong>Digital Skills Library</strong><small>Instant PDF access</small></span>
        </div>
      </header>

      <section className="store-section app-view" id="shop" aria-labelledby="store-title">
        <div className="store-preview-bar">
          <div><span className="preview-dot" />Secure digital-product store</div>
          <span>{cart.length} {cart.length === 1 ? "item" : "items"} in basket</span>
        </div>
        <div className="store-hero">
          <div>
            <p className="eyebrow">DIGITAL SKILLS LIBRARY</p>
            <h2 id="store-title">Practical guides to help you create, market and sell online.</h2>
            <p>Choose a focused toolkit and follow a clear path from idea to action. Receive instant PDF access after secure payment.</p>
          </div>
          <div className="store-basket-summary"><span>YOUR BASKET</span><strong>{cart.length}</strong><small>{cart.length === 1 ? "item" : "items"}</small></div>
        </div>

        <div className="public-shop-filters">
          <label><span className="sr-only">Search products</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ebooks and toolkits…" /></label>
          <label><span className="sr-only">Choose category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>

        <div className="store-layout">
          <div className="store-products">
            {visibleProducts.map((product) => (
              <article className="store-card" key={product.id}>
                <div className="store-cover">
                  <span className="cover-badge">{product.category}</span>
                  {product.coverUrl ? <img className="customer-cover-image" src={product.coverUrl} alt={`${product.title} cover`} /> : <div className="book-stack"><i /><i /><strong>PDF</strong></div>}
                  <small>{(product.pdfSize / 1024 / 1024).toFixed(1)} MB digital ebook</small>
                </div>
                <div className="store-card-content">
                  <p>INSTANT DIGITAL DOWNLOAD</p>
                  <h3>{product.title}</h3>
                  <span>{product.description}</span>
                  <div className="store-price"><strong>£{product.price.toFixed(2)}</strong><small>One-time payment</small></div>
                  <div className="store-card-actions">
                    <button className="details-button" disabled>Available now</button>
                    <button className="add-button" onClick={() => addToBasket(product.id)}>{cart.includes(product.id) ? "Added ✓" : "Add to basket"}</button>
                  </div>
                </div>
              </article>
            ))}
            {!visibleProducts.length && <div className="empty-state">No published products match this search yet.</div>}
          </div>

          <aside className="basket-panel">
            <div className="basket-heading"><div><p className="eyebrow">YOUR ORDER</p><h3>Basket</h3></div><span>{cart.length}</span></div>
            {!basketProducts.length ? <div className="empty-basket"><div>▣</div><strong>Your basket is empty</strong><p>Add an ebook to prepare your secure checkout.</p></div> :
              <div className="basket-items">{basketProducts.map((product) => <div className="basket-item" key={product.id}><span>PDF</span><div><strong>{product.title}</strong><small>Digital ebook</small></div><div><b>£{product.price.toFixed(2)}</b><button onClick={() => setCart((current) => current.filter((id) => id !== product.id))}>Remove</button></div></div>)}</div>}
            <div className="basket-total"><span>Total</span><strong>£{total.toFixed(2)}</strong></div>
            {checkoutError && <p className="checkout-error">{checkoutError}</p>}
            <button className="checkout-button public-checkout" disabled={!cart.length || checkoutState === "loading"} onClick={startCheckout}>{checkoutState === "loading" ? "Opening secure checkout…" : cart.length ? "Complete purchase" : "Add a product"}</button>
            <div className="checkout-trust"><span>Secure Stripe checkout</span><span>Private download links</span><span>Instant PDF access</span></div>
          </aside>
        </div>
        <div className="store-benefits" id="benefits"><span><strong>Instant access</strong><small>Secure downloads after payment</small></span><span><strong>Focused toolkits</strong><small>Clear resources built around outcomes</small></span><span><strong>Private delivery</strong><small>Download links expire for protection</small></span></div>
      </section>
    </main>
  );
}
