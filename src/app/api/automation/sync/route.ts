import { NextResponse } from "next/server";
import { getPaytmAdapter } from "@/lib/adapters/paytm";
import { prisma } from "@/lib/db";
import { generateReturn } from "@/lib/returns";
import { checkAutomationAuth } from "@/lib/automation";
import { currentPeriod } from "@/lib/utils";

/**
 * n8n / cron entrypoint: pull the latest Paytm settlements for every merchant
 * (or a single `gstin`) and refresh their GSTR-3B draft. Bearer-token protected.
 */
export async function POST(req: Request) {
  const auth = checkAutomationAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { gstin, period } = (await req.json().catch(() => ({}))) as { gstin?: string; period?: string };
  const per = period ?? currentPeriod();
  const adapter = getPaytmAdapter();

  const merchants = await prisma.merchant.findMany({
    where: gstin ? { gstin } : {},
    select: { id: true, gstin: true, businessName: true },
  });

  const results = [];
  for (const m of merchants) {
    const settlements = await adapter.fetchSettlements(m.gstin, per);
    for (const s of settlements) {
      await prisma.salesTransaction.upsert({
        where: { paytmTxnId: s.paytmTxnId },
        update: {},
        create: {
          merchantId: m.id,
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
    }
    await generateReturn(m.id, per);
    results.push({ gstin: m.gstin, business: m.businessName, settlements: settlements.length });
  }

  return NextResponse.json({ ok: true, period: per, merchants: results });
}
