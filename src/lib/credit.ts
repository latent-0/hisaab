import { prisma } from "./db";
import { clamp01, recentPeriods, round2 } from "./utils";

export interface CreditFactor {
  label: string;
  value: string;
  good: boolean;
}

export interface CreditOffer {
  eligible: boolean;
  amount: number; // pre-approved principal
  aprMin: number; // % p.a.
  aprMax: number;
  tenureMonths: number;
  emi: number;
  avgMonthlyRevenue: number;
  bookQuality: number; // 0..100
  factors: CreditFactor[];
  reason: string;
}

/**
 * Turn verified, reconciled books into a working-capital offer. In production
 * this hands the same signals to Paytm's underwriting; here it's a transparent,
 * deterministic calculation so merchants see exactly why they qualify.
 */
export async function getCreditOffer(merchantId: string): Promise<CreditOffer> {
  const periods = recentPeriods(3);

  // Verified monthly income from Paytm settlements (the sales side Paytm owns).
  let grossTotal = 0;
  let monthsWithSales = 0;
  for (const p of periods) {
    const agg = await prisma.salesTransaction.aggregate({
      where: { merchantId, period: p },
      _sum: { grossAmount: true },
    });
    const g = agg._sum.grossAmount ?? 0;
    grossTotal += g;
    if (g > 0) monthsWithSales++;
  }
  const avgMonthlyRevenue = round2(grossTotal / periods.length);

  // Book-quality signals.
  const invoices = await prisma.purchaseInvoice.findMany({
    where: { merchantId },
    select: { status: true, gstr2bStatus: true },
  });
  const with2b = invoices.filter((i) => ["matched", "missing", "mismatch"].includes(i.gstr2bStatus)).length;
  const matched = invoices.filter((i) => i.gstr2bStatus === "matched").length;
  const reconRate = with2b > 0 ? matched / with2b : 0;
  const approved = invoices.filter((i) => i.status === "approved").length;
  const itcHygiene = invoices.length > 0 ? approved / invoices.length : 0;
  const filedReturns = await prisma.gstReturn.count({ where: { merchantId } });
  const filingConsistency = clamp01(filedReturns / 3);
  const incomeConsistency = clamp01(monthsWithSales / 3);

  // Blend into a 0..1 quality score.
  const quality = clamp01(
    0.35 * reconRate + 0.25 * itcHygiene + 0.2 * filingConsistency + 0.2 * incomeConsistency,
  );
  const bookQuality = Math.round(quality * 100);

  // Offer: up to ~1.5 months of verified revenue, scaled by book quality.
  const rawAmount = avgMonthlyRevenue * 1.5 * (0.6 + 0.4 * quality);
  const amount = Math.max(0, Math.round(rawAmount / 5000) * 5000);

  // Better books → lower rate (18% base, down to ~13.5%).
  const aprMax = round2(18 - quality * 3);
  const aprMin = round2(aprMax - 1.5);
  const tenureMonths = 12;
  const monthlyRate = aprMin / 100 / 12;
  const emi =
    amount > 0
      ? round2((amount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1))
      : 0;

  const eligible = avgMonthlyRevenue > 20000 && amount >= 10000;

  const factors: CreditFactor[] = [
    { label: "Verified monthly income", value: `₹${Math.round(avgMonthlyRevenue).toLocaleString("en-IN")}`, good: avgMonthlyRevenue > 20000 },
    { label: "GSTR-2B reconciliation", value: `${Math.round(reconRate * 100)}%`, good: reconRate >= 0.7 },
    { label: "ITC / book hygiene", value: `${Math.round(itcHygiene * 100)}%`, good: itcHygiene >= 0.6 },
    { label: "Filing consistency", value: `${filedReturns} returns`, good: filingConsistency >= 0.6 },
  ];

  return {
    eligible,
    amount,
    aprMin,
    aprMax,
    tenureMonths,
    emi,
    avgMonthlyRevenue,
    bookQuality,
    factors,
    reason: eligible
      ? "Your verified Paytm income and clean, reconciled books pre-qualify you."
      : "Keep selling on Paytm and reconciling invoices to unlock an offer.",
  };
}
