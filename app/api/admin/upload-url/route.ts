import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { fileName, type } = await request.json();
  const clean = String(fileName ?? "file").replace(/[^a-zA-Z0-9._-]/g, "-");
  const bucket = type === "cover" ? "product-covers" : "product-files";
  const path = `${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${clean}`;
  const { data, error } = await adminDb().storage.from(bucket).createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ bucket, path, token: data.token });
}
