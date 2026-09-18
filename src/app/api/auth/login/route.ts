import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { merchantId, phone } = body as { merchantId?: string; phone?: string };

  let merchant = null;
  if (merchantId) {
    merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
  } else if (phone) {
    merchant = await prisma.merchant.findUnique({ where: { phone: phone.trim() } });
  }

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  await setSession(merchant.id);
  return NextResponse.json({ ok: true, merchantId: merchant.id });
}
