import { EXPENSE_CATEGORIES } from "./constants";
import { prisma } from "./db";
import { buildReturnData } from "./returns";
import { periodLabel, recentPeriods, round2 } from "./utils";

// Estimated manual minutes per invoice (data entry + matching + 2B check) that
// Hisaab automates away. Conservative; used only for the "time saved" impact.
const MINUTES_SAVED_PER_INVOICE = 8;
const MINUTES_SAVED_PER_RETURN = 45;

export interface AnalyticsData {
  totals: {
    itcIdentified: number;
    itcClaimed: number;
    itcAtRisk: number;
    blocked: number;
  };
  invoicesProcessed: number;
  settlementsReconciled: number;
  returnsDrafted: number;
  reconciliationRate: number; // 0..1 of invoices matched in 2B
  hoursSaved: number;
  twoB: { matched: number; missing: number; mismatch: number; unknown: number };
  trend: Array<{ label: string; outputTax: number; itc: number; net: number }>;
  recoverySplit: Array<{ name: string; value: number }>;
  categorySpend: Array<{ name: string; value: number }>;
  channelSplit: Array<{ name: string; value: number }>;
  twoBSplit: Array<{ name: string; value: number }>;
  topSuppliers: Array<{ name: string; itc: number; invoices: number }>;
}

export async function getAnalytics(merchantId: string): Promise<AnalyticsData> {
  const invoices = await prisma.purchaseInvoice.findMany({
    where: { merchantId },
    select: {
      cgst: true,
      sgst: true,
      igst: true,
      taxableValue: true,
      itcEligible: true,
      status: true,
      gstr2bStatus: true,
      category: true,
      supplierName: true,
    },
  });

  const gstOf = (i: { cgst: number; sgst: number; igst: number }) => i.cgst + i.sgst + i.igst;

  let itcIdentified = 0;
  let itcClaimed = 0;
  let itcAtRisk = 0;
  let blocked = 0;
  const twoB = { matched: 0, missing: 0, mismatch: 0, unknown: 0 };
  const categoryMap = new Map<string, number>();
  const supplierMap = new Map<string, { itc: number; invoices: number }>();

  for (const i of invoices) {
    const gst = gstOf(i);
    if (i.itcEligible === false) {
      blocked = round2(blocked + gst);
    } else if (i.itcEligible) {
      itcIdentified = round2(itcIdentified + gst);
      if (i.status === "approved") itcClaimed = round2(itcClaimed + gst);
      else if (i.status === "needs_review") itcAtRisk = round2(itcAtRisk + gst);
    }
    if (i.gstr2bStatus in twoB) twoB[i.gstr2bStatus as keyof typeof twoB]++;

    const catKey = i.category ?? "uncategorised";
    categoryMap.set(catKey, round2((categoryMap.get(catKey) ?? 0) + (i.taxableValue ?? 0)));

    const sup = i.supplierName ?? "Unknown supplier";
    const cur = supplierMap.get(sup) ?? { itc: 0, invoices: 0 };
    supplierMap.set(sup, {
      itc: round2(cur.itc + (i.itcEligible ? gst : 0)),
      invoices: cur.invoices + 1,
    });
  }

  const settlementsReconciled = await prisma.salesTransaction.count({ where: { merchantId } });
  const returnsDrafted = await prisma.gstReturn.count({ where: { merchantId } });

  const matched = twoB.matched;
  const totalWith2b = twoB.matched + twoB.missing + twoB.mismatch;
  const reconciliationRate = totalWith2b > 0 ? matched / totalWith2b : 0;

  const hoursSaved = round2(
    (invoices.length * MINUTES_SAVED_PER_INVOICE + returnsDrafted * MINUTES_SAVED_PER_RETURN) / 60,
  );

  // 6-month trend from the period returns.
  const periods = recentPeriods(6);
  const trend = [] as AnalyticsData["trend"];
  for (const p of periods) {
    const d = await buildReturnData(merchantId, p);
    trend.push({
      label: periodLabel(p).split(" ")[0].slice(0, 3),
      outputTax: round2(d.outputTax),
      itc: round2(d.itcClaimed),
      net: round2(d.netPayable),
    });
  }

  // Channel split from settlements.
  const channelAgg = await prisma.salesTransaction.groupBy({
    by: ["channel"],
    where: { merchantId },
    _sum: { grossAmount: true },
  });
  const channelLabel: Record<string, string> = { qr: "QR", soundbox: "Soundbox", edc: "EDC / card" };
  const channelSplit = channelAgg.map((c) => ({
    name: channelLabel[c.channel] ?? c.channel,
    value: round2(c._sum.grossAmount ?? 0),
  }));

  const categorySpend = [...categoryMap.entries()]
    .map(([k, v]) => ({ name: EXPENSE_CATEGORIES[k]?.label ?? k, value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const topSuppliers = [...supplierMap.entries()]
    .map(([name, v]) => ({ name, itc: v.itc, invoices: v.invoices }))
    .sort((a, b) => b.itc - a.itc)
    .slice(0, 5);

  return {
    totals: { itcIdentified, itcClaimed, itcAtRisk, blocked },
    invoicesProcessed: invoices.length,
    settlementsReconciled,
    returnsDrafted,
    reconciliationRate,
    hoursSaved,
    twoB,
    trend,
    recoverySplit: [
      { name: "Claimed", value: itcClaimed },
      { name: "At risk", value: itcAtRisk },
      { name: "Blocked (17(5))", value: blocked },
    ],
    categorySpend,
    channelSplit,
    twoBSplit: [
      { name: "Matched", value: twoB.matched },
      { name: "Not in 2B", value: twoB.missing },
      { name: "Mismatch", value: twoB.mismatch },
    ],
    topSuppliers,
  };
}
