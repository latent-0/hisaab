import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkAutomationAuth } from "@/lib/automation";
import { inr } from "@/lib/utils";

/**
 * n8n / cron entrypoint: every invoice currently needing review, grouped by
 * merchant, plus a ready-to-post Slack digest string. Bearer-token protected.
 */
export async function GET(req: Request) {
  const auth = checkAutomationAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const invoices = await prisma.purchaseInvoice.findMany({
    where: { status: "needs_review" },
    orderBy: { updatedAt: "desc" },
    include: { merchant: { select: { businessName: true, gstin: true } } },
  });

  const byMerchant = new Map<string, { business: string; gstin: string; items: string[]; itc: number }>();
  for (const inv of invoices) {
    const key = inv.merchantId;
    const gst = inv.cgst + inv.sgst + inv.igst;
    const cur = byMerchant.get(key) ?? {
      business: inv.merchant.businessName,
      gstin: inv.merchant.gstin,
      items: [],
      itc: 0,
    };
    cur.items.push(
      `• ${inv.supplierName ?? "Unknown"}, ${inv.invoiceNo ?? "no #"} (${inr(gst)} ITC, 2B: ${inv.gstr2bStatus})`,
    );
    cur.itc += gst;
    byMerchant.set(key, cur);
  }

  const groups = [...byMerchant.values()];
  const totalItc = groups.reduce((a, g) => a + g.itc, 0);

  const slackText =
    invoices.length === 0
      ? "✅ Hisaab: no invoices are flagged for review right now."
      : [
          `🧾 *Hisaab, ${invoices.length} invoice(s) flagged for review* (${inr(totalItc)} ITC at stake)`,
          "",
          ...groups.map((g) => `*${g.business}* (${g.gstin}), ${inr(g.itc)} ITC\n${g.items.join("\n")}`),
        ].join("\n");

  return NextResponse.json({
    ok: true,
    flaggedCount: invoices.length,
    totalItcAtStake: totalItc,
    merchants: groups,
    slackText,
  });
}
