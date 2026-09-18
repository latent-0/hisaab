import type { PurchaseInvoice, SalesTransaction } from "@prisma/client";
import { GST_RATES, type GstRate } from "./constants";
import { prisma } from "./db";
import type { DashboardStats, GstReturnData, RateBreakdown } from "./types";
import { round2 } from "./utils";

function emptyBreakdown(): Record<GstRate, RateBreakdown> {
  const map = {} as Record<GstRate, RateBreakdown>;
  for (const r of GST_RATES) map[r] = { rate: r, taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };
  return map;
}

function snap(rate: number | null | undefined): GstRate {
  if (rate == null) return 18;
  let best: GstRate = 18;
  let d = Infinity;
  for (const r of GST_RATES) {
    const dd = Math.abs(r - rate);
    if (dd < d) {
      d = dd;
      best = r;
    }
  }
  return best;
}

function itcOf(inv: PurchaseInvoice): number {
  return round2(inv.cgst + inv.sgst + inv.igst);
}

/**
 * The Generate agent: aggregate the period's sales (output tax) and approved,
 * eligible purchases (ITC) into a GSTR-3B payload.
 */
export async function buildReturnData(merchantId: string, period: string): Promise<GstReturnData> {
  const merchant = await prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });
  const sales = await prisma.salesTransaction.findMany({ where: { merchantId, period } });
  const purchases = await prisma.purchaseInvoice.findMany({ where: { merchantId, period } });

  // --- Outward supplies (output tax) from sales ---
  const outMap = emptyBreakdown();
  for (const s of sales as SalesTransaction[]) {
    const r = snap(s.gstRate);
    outMap[r].taxableValue = round2(outMap[r].taxableValue + s.taxableValue);
    outMap[r].cgst = round2(outMap[r].cgst + s.cgst);
    outMap[r].sgst = round2(outMap[r].sgst + s.sgst);
    outMap[r].igst = round2(outMap[r].igst + s.igst);
  }

  // --- ITC from approved, eligible purchases ---
  const itcMap = emptyBreakdown();
  let blocked = 0;
  let itcAtRisk = 0;
  let invoicesFlagged = 0;
  for (const p of purchases) {
    const gst = itcOf(p);
    if (p.itcEligible === false) {
      blocked = round2(blocked + gst);
      continue;
    }
    // Eligible:
    if (p.status === "approved") {
      const r = snap(p.gstRate);
      itcMap[r].taxableValue = round2(itcMap[r].taxableValue + (p.taxableValue ?? 0));
      itcMap[r].cgst = round2(itcMap[r].cgst + p.cgst);
      itcMap[r].sgst = round2(itcMap[r].sgst + p.sgst);
      itcMap[r].igst = round2(itcMap[r].igst + p.igst);
    } else {
      // Eligible but not yet approved => recoverable if resolved.
      itcAtRisk = round2(itcAtRisk + gst);
      if (p.status === "needs_review") invoicesFlagged++;
    }
  }

  const outward = Object.values(outMap).filter((b) => b.taxableValue > 0 || b.cgst > 0 || b.igst > 0);
  const itc = Object.values(itcMap).filter((b) => b.cgst > 0 || b.sgst > 0 || b.igst > 0);

  const outTotals = sumBreakdown(outward);
  const itcTotals = sumBreakdown(itc);

  const outputTax = round2(outTotals.cgst + outTotals.sgst + outTotals.igst);
  const itcClaimed = round2(itcTotals.cgst + itcTotals.sgst + itcTotals.igst);
  const netCgst = Math.max(0, round2(outTotals.cgst - itcTotals.cgst));
  const netSgst = Math.max(0, round2(outTotals.sgst - itcTotals.sgst));
  const netIgst = Math.max(0, round2(outTotals.igst - itcTotals.igst));
  const netPayable = round2(netCgst + netSgst + netIgst);

  return {
    period,
    merchant: { businessName: merchant.businessName, gstin: merchant.gstin, stateName: merchant.stateName },
    outwardSupplies: {
      total: outward,
      taxableValue: outTotals.taxableValue,
      cgst: outTotals.cgst,
      sgst: outTotals.sgst,
      igst: outTotals.igst,
    },
    itc: {
      total: itc,
      taxableValue: itcTotals.taxableValue,
      cgst: itcTotals.cgst,
      sgst: itcTotals.sgst,
      igst: itcTotals.igst,
      blocked,
    },
    netLiability: { cgst: netCgst, sgst: netSgst, igst: netIgst, total: netPayable },
    outputTax,
    itcClaimed,
    netPayable,
    itcAtRisk,
    invoicesConsidered: purchases.length,
    invoicesFlagged,
    generatedAt: new Date().toISOString(),
  };
}

function sumBreakdown(rows: RateBreakdown[]) {
  return rows.reduce(
    (acc, r) => ({
      taxableValue: round2(acc.taxableValue + r.taxableValue),
      cgst: round2(acc.cgst + r.cgst),
      sgst: round2(acc.sgst + r.sgst),
      igst: round2(acc.igst + r.igst),
    }),
    { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 },
  );
}

/** Generate and persist a GSTR-3B draft, recording an AgentRun "generate" step. */
export async function generateReturn(merchantId: string, period: string) {
  const engine = (await import("./ai")).getEngine();
  const t = Date.now();
  const data = await buildReturnData(merchantId, period);

  const saved = await prisma.gstReturn.upsert({
    where: { merchantId_period_type: { merchantId, period, type: "GSTR3B" } },
    update: {
      data: JSON.stringify(data),
      outputTax: data.outputTax,
      itcClaimed: data.itcClaimed,
      netPayable: data.netPayable,
      status: "draft",
      generatedAt: new Date(),
    },
    create: {
      merchantId,
      period,
      type: "GSTR3B",
      data: JSON.stringify(data),
      outputTax: data.outputTax,
      itcClaimed: data.itcClaimed,
      netPayable: data.netPayable,
    },
  });

  await prisma.agentRun.create({
    data: {
      merchantId,
      status: "completed",
      provider: engine.name,
      finishedAt: new Date(),
      steps: JSON.stringify([
        {
          agent: "generate",
          label: "Generate",
          status: data.invoicesFlagged > 0 ? "review" : "ok",
          confidence: 0.99,
          summary: `GSTR-3B drafted for ${period}: output ₹${data.outputTax}, ITC ₹${data.itcClaimed}, net ₹${data.netPayable}.`,
          durationMs: Date.now() - t,
          provider: engine.name,
        },
      ]),
    },
  });

  return saved;
}

export async function computeDashboardStats(
  merchantId: string,
  period: string,
): Promise<DashboardStats> {
  const data = await buildReturnData(merchantId, period);
  const salesAgg = await prisma.salesTransaction.aggregate({
    where: { merchantId, period },
    _sum: { grossAmount: true },
    _count: true,
  });
  const invoiceCount = await prisma.purchaseInvoice.count({ where: { merchantId, period } });
  const reviewOpen = await prisma.reviewTask.count({ where: { merchantId, status: "open" } });

  return {
    period,
    unclaimedItc: data.itcAtRisk,
    itcThisMonth: data.itcClaimed,
    outputTax: data.outputTax,
    netPayable: data.netPayable,
    flaggedCount: data.invoicesFlagged,
    invoiceCount,
    salesCount: salesAgg._count,
    salesTotal: round2(salesAgg._sum.grossAmount ?? 0),
    reviewOpen,
  };
}
