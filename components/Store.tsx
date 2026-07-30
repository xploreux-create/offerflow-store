"use client";

import { useMemo, useState } from "react";

export type Product = {
  id: string; title: string; description: string; category: string;
  price_pence: number; cover_url: string | null;
};

export default function Store({ initialProducts }: { initialProducts: Product[] }) {
  const [cart, setCart] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const categories = ["All", ...Array.from(new Set(initialProducts.map(p => p.category)))];
  const products = useMemo(() => initialProducts.filter(p =>
    (category === "All" || p.category === category) &&
    `${p.title} ${p.description}`.toLowerCase().includes(query.toLowerCase())
  ), [initialProducts, query, category]);
  const total = cart.reduce((sum, p) => sum + p.price_pence, 0);

  function add(product: Product) {
    setCart(current => current.some(p => p.id === product.id) ? current : [...current, product]);
    setOpen(true);
  }

  async function checkout() {
    setError(""); setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: cart.map(p => p.id) })
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout could not start");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout could not start");
      setLoading(false);
    }
  }

  return <>
    <div className="topbar">Instant PDF access after secure checkout</div>
    <header className="shell nav">
      <a className="brand" href="/">Offer<span>Flow</span></a>
      <nav className="navlinks"><a href="#shop">Shop</a><a href="#how">How it works</a><a href="/admin">Seller login</a></nav>
      <button className="cart" onClick={() => setOpen(true)}>Basket · {cart.length}</button>
    </header>
    <main>
      <section className="shell hero">
        <div>
          <span className="pill">PRACTICAL DIGITAL RESOURCES</span>
          <h1>Learn it. Use it. <em>Grow with it.</em></h1>
          <p>Action-focused ebooks, templates and toolkits for creators and small-business owners who want clear guidance without the overwhelm.</p>
          <div className="cta"><a className="primary" href="#shop">Explore the shop</a><a className="secondary" href="#how">How it works</a></div>
        </div>
        <div className="hero-art" aria-label="OfferFlow digital toolkit illustration">
          <div className="book"><small>OFFERFLOW ORIGINAL</small><h2>UGC Brand Deal Starter Toolkit</h2><p>A beginner-friendly route to your first brand collaboration.</p></div>
        </div>
      </section>
      <section className="section" id="shop">
        <div className="shell">
          <div className="section-head"><h2>Find your next step</h2><p>Browse practical resources created to help you start, market and grow an online income stream.</p></div>
          <div className="filters">
            <input className="field" aria-label="Search products" placeholder="Search ebooks and toolkits…" value={query} onChange={e => setQuery(e.target.value)} />
            <select className="field" aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="products">
            {products.map(product => <article className="card" key={product.id}>
              {product.cover_url ? <img className="cover" src={product.cover_url} alt={`${product.title} cover`} /> : <div className="cover-placeholder">OF</div>}
              <div className="card-body"><span className="category">{product.category}</span><h3>{product.title}</h3><p>{product.description}</p>
                <div className="price-row"><span className="price">£{(product.price_pence / 100).toFixed(2)}</span><button className="add" onClick={() => add(product)}>Add to basket</button></div>
              </div>
            </article>)}
            {!products.length && <div className="empty">No published products match your search yet.</div>}
          </div>
        </div>
      </section>
      <section className="section shell" id="how"><div className="panel"><div className="section-head"><h2>Simple from purchase to download</h2></div><p>Choose your resource, pay securely through Stripe, then download your PDF immediately from the confirmation page. Your files remain private until payment is confirmed.</p></div></section>
    </main>
    <footer className="footer"><div className="shell footer-grid"><div><div className="brand">OfferFlow</div><p>Practical digital resources for creators and growing businesses.</p></div><div><b>Shop</b><p><a href="#shop">All products</a></p></div><div><b>Support</b><p>Contact details can be added before launch.</p></div></div></footer>
    {open && <div className="drawer-backdrop" onClick={() => setOpen(false)}><aside className="drawer" onClick={e => e.stopPropagation()}>
      <div className="drawer-head"><h2>Your basket</h2><button className="icon-btn" aria-label="Close basket" onClick={() => setOpen(false)}>×</button></div>
      <div className="basket-items">{cart.length ? cart.map(p => <div className="basket-item" key={p.id}><div><b>{p.title}</b><br/>£{(p.price_pence/100).toFixed(2)}</div><button onClick={() => setCart(c => c.filter(x => x.id !== p.id))}>Remove</button></div>) : <p>Your basket is empty.</p>}</div>
      {error && <div className="notice">{error}</div>}<div className="total"><span>Total</span><span>£{(total/100).toFixed(2)}</span></div>
      <button className="primary full" disabled={!cart.length || loading} onClick={checkout}>{loading ? "Opening secure checkout…" : "Complete purchase"}</button>
    </aside></div>}
  </>;
}
