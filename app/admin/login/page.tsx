"use client";
import { FormEvent, useState } from "react";

export default function AdminLogin() {
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/admin/login", { method: "POST", body: JSON.stringify({ password: form.get("password") }), headers: { "Content-Type": "application/json" } });
    if (response.ok) window.location.href = "/admin"; else setError("Incorrect password");
  }
  return <main className="login"><form className="login-card" onSubmit={submit}><div className="brand login-brand"><img src="/brand/vendlixa-mark.png" alt="" /><span>Vendlixa</span></div><h1>Seller login</h1><p>Manage products and publish them to your store.</p>{error && <div className="notice">{error}</div>}<label className="label" htmlFor="password">Admin password</label><input className="field" id="password" name="password" type="password" required/><br/><br/><button className="primary full">Sign in</button></form></main>;
}
