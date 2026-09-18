import { cookies } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "./db";

const COOKIE = "hisaab_session";
const SECRET = process.env.SESSION_SECRET || "dev-hisaab-secret-change-me";

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
  return `${value}.${mac}`;
}

function verify(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
  // timingSafeEqual requires equal-length buffers.
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

export async function setSession(merchantId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, sign(merchantId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSessionMerchantId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  return verify(raw);
}

/** Returns the logged-in merchant, or null. */
export async function getCurrentMerchant() {
  const id = await getSessionMerchantId();
  if (!id) return null;
  return prisma.merchant.findUnique({ where: { id } });
}

/** Like getCurrentMerchant but throws (for API routes that require auth). */
export async function requireMerchant() {
  const m = await getCurrentMerchant();
  if (!m) throw new Response("Unauthorized", { status: 401 });
  return m;
}
