import { prisma } from "./db";
import { computeDashboardStats } from "./returns";
import { currentPeriod, round2 } from "./utils";

/**
 * Real, live aggregate metrics computed from the database, used on the landing
 * page to show the system's actual working impact (grows as invoices are added).
 */
export async function getImpactStats() {
  const [merchants, invoices, settlementCount, salesAgg, returnsDrafted] = await Promise.all([
    prisma.merchant.count(),
    prisma.purchaseInvoice.findMany({
      select: { cgst: true, sgst: true, igst: true, itcEligible: true, status: true },
    }),
    prisma.salesTransaction.count(),
    prisma.salesTransaction.aggregate({ _sum: { grossAmount: true } }),
    prisma.gstReturn.count(),
  ]);

  const itcIdentified = round2(
    invoices
      .filter((i) => i.itcEligible)
      .reduce((a, i) => a + i.cgst + i.sgst + i.igst, 0),
  );

  return {
    merchants,
    invoicesProcessed: invoices.length,
    settlementsReconciled: settlementCount,
    gstReconciled: round2(salesAgg._sum.grossAmount ?? 0),
    itcIdentified,
    returnsDrafted,
  };
}

/**
 * A real snapshot for the hero card: the current-period numbers of the primary
 * demo merchant, straight from the pipeline. Falls back to representative
 * figures if the database hasn't been seeded yet.
 */
export async function getHeroSnapshot() {
  const merchant = await prisma.merchant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!merchant) {
    return {
      businessName: "Your business",
      period: currentPeriod(),
      unclaimedItc: 4120,
      itcThisMonth: 16626,
      salesTotal: 168732,
      netPayable: 2432,
      flaggedCount: 2,
      live: false,
    };
  }
  const stats = await computeDashboardStats(merchant.id, currentPeriod());
  return {
    businessName: merchant.businessName,
    period: stats.period,
    unclaimedItc: stats.unclaimedItc,
    itcThisMonth: stats.itcThisMonth,
    salesTotal: stats.salesTotal,
    netPayable: stats.netPayable,
    flaggedCount: stats.flaggedCount,
    live: true,
  };
}
