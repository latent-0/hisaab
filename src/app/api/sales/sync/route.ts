import { NextResponse } from "next/server";
import { getPaytmAdapter } from "@/lib/adapters/paytm";
import { prisma } from "@/lib/db";
import { generateReturn } from "@/lib/returns";
import { getCurrentMerchant } from "@/lib/session";
import { currentPeriod } from "@/lib/utils";

/**
 * Pull the latest Paytm settlements for a period and refresh the GSTR-3B draft.
 * In production this is the adapter call to Paytm's settlement API; here it uses
 * the deterministic sandbox adapter.
 */
export async function POST(req: Request) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { period } = (await req.json().catch(() => ({}))) as { period?: string };
  const per = period ?? currentPeriod();

  const adapter = getPaytmAdapter();
  const settlements = await adapter.fetchSettlements(merchant.gstin, per);

  let added = 0;
  for (const s of settlements) {
    const res = await prisma.salesTransaction.upsert({
      where: { paytmTxnId: s.paytmTxnId },
      update: {},
      create: {
        merchantId: merchant.id,
        paytmTxnId: s.paytmTxnId,
        channel: s.channel,
        grossAmount: s.grossAmount,
        taxableValue: s.taxableValue,
        gstRate: s.gstRate,
        cgst: s.cgst,
        sgst: s.sgst,
        igst: s.igst,
        hsnCode: s.hsnCode,
        category: s.category,
        settledAt: new Date(s.settledAt),
        period: per,
      },
    });
    if (res) added++;
  }

  await generateReturn(merchant.id, per);
  return NextResponse.json({ ok: true, period: per, settlements: settlements.length });
}
