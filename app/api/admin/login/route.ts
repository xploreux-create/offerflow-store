import { NextResponse } from "next/server";
import { adminToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = await request.json();
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("vendlixa_admin", adminToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 60 * 60 * 12, path: "/" });
  return response;
}
