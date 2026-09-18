import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateReturn } from "@/lib/returns";
import { getCurrentMerchant } from "@/lib/session";

/** Regenerate the draft, or mark it reviewed / filed. */
export async function POST(req: Request, { params }: { params: Promise<{ period: string }> }) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { period } = await params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };

  if (action === "review") {
    await prisma.gstReturn.update({
      where: { merchantId_period_type: { merchantId: merchant.id, period, type: "GSTR3B" } },
      data: { status: "reviewed", reviewedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "file") {
    await prisma.gstReturn.update({
      where: { merchantId_period_type: { merchantId: merchant.id, period, type: "GSTR3B" } },
      data: { status: "filed", filedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  // default: (re)generate
  const saved = await generateReturn(merchant.id, period);
  return NextResponse.json({ ok: true, id: saved.id });
}
