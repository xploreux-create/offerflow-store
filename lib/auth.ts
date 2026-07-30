import { cookies } from "next/headers";
import crypto from "crypto";

export function adminToken() {
  const password = process.env.ADMIN_PASSWORD ?? "";
  return crypto.createHash("sha256").update(`vendlixa:${password}`).digest("hex");
}

export async function isAdmin() {
  const jar = await cookies();
  const supplied = jar.get("vendlixa_admin")?.value ?? "";
  const expected = adminToken();
  return Boolean(process.env.ADMIN_PASSWORD && supplied.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)));
}
