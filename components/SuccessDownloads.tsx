"use client";
import { useEffect, useState } from "react";

export default function SuccessDownloads({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<{ email?: string; downloads?: {id:string;title:string;url:string}[]; error?: string }>({});
  useEffect(() => {
    fetch(`/api/downloads?session_id=${encodeURIComponent(sessionId)}`).then(r => r.json()).then(setState).catch(() => setState({ error: "Unable to load your downloads" }));
  }, [sessionId]);
  if (state.error) return <div className="notice">{state.error}. Please contact support with your order email.</div>;
  if (!state.downloads) return <p>Confirming your payment and preparing your files…</p>;
  return <><p>Payment confirmed{state.email ? ` for ${state.email}` : ""}. Your private links remain active for one hour.</p><div className="download-list">{state.downloads.map(d => <a className="download-link" href={d.url} key={d.id}><span>{d.title}</span><span>Download PDF ↓</span></a>)}</div></>;
}
