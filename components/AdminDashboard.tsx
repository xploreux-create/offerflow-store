"use client";
import { FormEvent, useEffect, useState } from "react";
import { browserDb } from "@/lib/supabase";

type AdminProduct = { id:string; title:string; category:string; price_pence:number; status:string; pdf_size:number };

export default function AdminDashboard() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const load = () => fetch("/api/admin/products").then(r => r.json()).then(d => setProducts(d.products ?? []));
  useEffect(() => { load(); }, []);

  async function upload(file: File, type: "pdf"|"cover", offset: number) {
    const response = await fetch("/api/admin/upload-url", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({fileName:file.name,type}) });
    const signed = await response.json();
    if (!response.ok) throw new Error(signed.error || "Upload preparation failed");
    const db = browserDb();
    const { error } = await db.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType:file.type });
    if (error) throw error;
    setProgress(offset);
    return signed.path as string;
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setMessage(""); setProgress(5);
    try {
      const form = new FormData(e.currentTarget);
      const pdf = form.get("pdf") as File; const cover = form.get("cover") as File;
      if (!pdf?.size || pdf.type !== "application/pdf") throw new Error("Select a valid PDF");
      if (pdf.size > 200 * 1024 * 1024) throw new Error("PDF must be 200 MB or smaller");
      const pdfPath = await upload(pdf, "pdf", 60);
      const coverPath = cover?.size ? await upload(cover, "cover", 85) : null;
      const response = await fetch("/api/admin/products", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
        title:form.get("title"), description:form.get("description"), category:form.get("category"), price:form.get("price"),
        status:form.get("status"), pdfPath, pdfName:pdf.name, pdfSize:pdf.size, coverPath
      })});
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setProgress(100); setMessage(data.product.status === "published" ? "Product uploaded and published to the store." : "Product saved as a draft.");
      e.currentTarget.reset(); load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Upload failed"); setProgress(0); }
    finally { setSaving(false); }
  }

  async function toggle(product: AdminProduct) {
    await fetch("/api/admin/products", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id:product.id,status:product.status === "published" ? "draft" : "published"}) }); load();
  }

  return <div className="admin-page"><header className="admin-nav"><div className="shell"><div className="brand">Offer<span>Flow</span> Admin</div><a href="/">View store →</a></div></header><main className="shell admin-main">
    <h1>Product manager</h1><p>Upload once, publish when ready, and manage what customers see.</p>
    <form className="panel" onSubmit={submit}><h2>Add a digital product</h2><div className="form-grid">
      <div><label className="label" htmlFor="title">Product title</label><input className="field" id="title" name="title" required /></div>
      <div><label className="label" htmlFor="category">Category</label><select className="field" id="category" name="category"><option>UGC & Creator</option><option>Digital Products</option><option>Faceless Marketing</option><option>Business</option><option>Finance</option><option>Social Media</option><option>E-commerce</option><option>Templates & Planners</option></select></div>
      <div className="wide"><label className="label" htmlFor="description">Description</label><textarea className="field" id="description" name="description" rows={3} required /></div>
      <div><label className="label" htmlFor="price">Price (£)</label><input className="field" id="price" name="price" type="number" min=".50" step=".01" required /></div>
      <div><label className="label" htmlFor="status">Publishing</label><select className="field" id="status" name="status"><option value="draft">Save as draft</option><option value="published">Publish to store</option></select></div>
      <div><label className="label" htmlFor="pdf">PDF file · maximum 200 MB</label><input className="field" id="pdf" name="pdf" type="file" accept="application/pdf" required /></div>
      <div><label className="label" htmlFor="cover">Cover image · maximum 10 MB</label><input className="field" id="cover" name="cover" type="file" accept="image/png,image/jpeg,image/webp" /></div>
    </div><br/>{progress > 0 && <div className="progress" aria-label={`Upload ${progress}% complete`}><span style={{width:`${progress}%`}} /></div>}{message && <p>{message}</p>}<button className="primary" disabled={saving}>{saving ? "Uploading securely…" : "Upload product"}</button></form>
    <section className="panel"><h2>Your products</h2><div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>PDF size</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {products.map(p => <tr key={p.id}><td><b>{p.title}</b></td><td>{p.category}</td><td>£{(p.price_pence/100).toFixed(2)}</td><td>{(p.pdf_size/1024/1024).toFixed(1)} MB</td><td><span className={`badge ${p.status === "published" ? "live" : ""}`}>{p.status}</span></td><td><button className="secondary" onClick={() => toggle(p)}>{p.status === "published" ? "Unpublish" : "Publish"}</button></td></tr>)}
      {!products.length && <tr><td colSpan={6}>No products uploaded yet.</td></tr>}
    </tbody></table></div></section>
  </main></div>;
}
