import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMerchant } from "@/lib/session";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";

export async function PATCH(req: Request) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const data: Record<string, string> = {};
  for (const key of ["businessName", "ownerName", "email", "language", "planTier"]) {
    if (typeof body[key] === "string" && body[key].trim()) data[key] = body[key].trim();
  }
  if (data.language && !SUPPORTED_LANGUAGES[data.language]) delete data.language;
  if (data.planTier && !["free", "pro"].includes(data.planTier)) delete data.planTier;

  await prisma.merchant.update({ where: { id: merchant.id }, data });
  return NextResponse.json({ ok: true });
}
