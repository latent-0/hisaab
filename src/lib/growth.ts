import { prisma } from "./db";
import { clamp01, currentPeriod, periodLabel, recentPeriods, round2 } from "./utils";

// We don't do per-item inventory accounting, so gross profit is estimated at a
// typical kirana/retail gross margin. Purchases are shown separately as cash
// deployed into stock — a cash-flow signal, not the same as cost-of-goods-sold.
const EST_MARGIN = 0.14;

export interface HealthTrendPoint {
  label: string;
  revenue: number;
  cost: number; // purchases (cash deployed) that month
  profit: number; // estimated gross profit
}

export interface ScoreComponent {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface BusinessHealth {
  period: string;
  revenue: number;
  purchases: number;
  estGrossProfit: number;
  marginPct: number;
  momGrowth: number;
  receivablesOpen: number;
  receivablesOverdue: number;
  growthScore: number;
  components: ScoreComponent[];
  trend: HealthTrendPoint[];
  tips: string[];
}

async function periodData(merchantId: string, period: string) {
  const [sales, purchases] = await Promise.all([
    prisma.salesTransaction.aggregate({ where: { merchantId, period }, _sum: { taxableValue: true } }),
    prisma.purchaseInvoice.aggregate({ where: { merchantId, period }, _sum: { taxableValue: true } }),
  ]);
  const revenue = round2(sales._sum.taxableValue ?? 0);
  const purchase = round2(purchases._sum.taxableValue ?? 0);
  return { revenue, purchase };
}

export async function getBusinessHealth(merchantId: string): Promise<BusinessHealth> {
  const period = currentPeriod();
  const periods = recentPeriods(6);

  const trend: HealthTrendPoint[] = [];
  for (const p of periods) {
    const { revenue, purchase } = await periodData(merchantId, p);
    trend.push({ label: periodLabel(p).split(" ")[0].slice(0, 3), revenue, cost: purchase, profit: round2(revenue * EST_MARGIN) });
  }

  const cur = trend[trend.length - 1];
  const prev = trend[trend.length - 2] ?? { revenue: 0 };
  const revenue = cur.revenue;
  const purchases = cur.cost;
  const estGrossProfit = round2(revenue * EST_MARGIN);
  const marginPct = Math.round(EST_MARGIN * 100);
  const momGrowth = prev.revenue > 0 ? round2(((revenue - prev.revenue) / prev.revenue) * 100) : 0;

  // Compliance signal.
  const invoices = await prisma.purchaseInvoice.findMany({ where: { merchantId }, select: { gstr2bStatus: true } });
  const with2b = invoices.filter((i) => ["matched", "missing", "mismatch"].includes(i.gstr2bStatus)).length;
  const matched = invoices.filter((i) => i.gstr2bStatus === "matched").length;
  const reconRate = with2b > 0 ? matched / with2b : 0;

  // Cash / collections signal from the khata.
  const receivables = await prisma.ledgerEntry.findMany({
    where: { merchantId, kind: "receivable", status: "open" },
    select: { amount: true, dueDate: true },
  });
  const receivablesOpen = round2(receivables.reduce((a, r) => a + r.amount, 0));
  const now = Date.now();
  const receivablesOverdue = round2(receivables.filter((r) => r.dueDate && r.dueDate.getTime() < now).reduce((a, r) => a + r.amount, 0));
  const overdueRatio = receivablesOpen > 0 ? receivablesOverdue / receivablesOpen : 0;

  // Inventory / cash balance: buying far more than you sell strains cash.
  const purchaseRatio = revenue > 0 ? purchases / revenue : 0;

  const revenueScore = Math.round(clamp01(revenue / 200000) * 100);
  const growthScoreC = Math.round(clamp01(0.5 + momGrowth / 40) * 100);
  const complianceScore = Math.round(reconRate * 100);
  const cashScore = Math.round((1 - overdueRatio) * 100);
  const inventoryScore = Math.round(clamp01(1 - Math.max(0, purchaseRatio - 1)) * 100);

  const components: ScoreComponent[] = [
    { key: "revenue", label: "Revenue scale", score: revenueScore, weight: 25, detail: "Monthly taxable sales" },
    { key: "growth", label: "Growth", score: growthScoreC, weight: 20, detail: "Month-on-month revenue" },
    { key: "compliance", label: "Compliance", score: complianceScore, weight: 20, detail: "GSTR-2B match rate" },
    { key: "cash", label: "Collections", score: cashScore, weight: 20, detail: "Receivables not overdue" },
    { key: "inventory", label: "Cash balance", score: inventoryScore, weight: 15, detail: "Purchases vs sales" },
  ];
  const overall = Math.round(components.reduce((a, c) => a + (c.score * c.weight) / 100, 0));

  const tips: string[] = [];
  if (complianceScore < 80) tips.push("Resolve GSTR-2B mismatches to protect input tax credit and lift compliance.");
  if (cashScore < 90 && receivablesOverdue > 0) tips.push(`₹${Math.round(receivablesOverdue).toLocaleString("en-IN")} of udhaar is overdue — send reminders from Khata.`);
  if (purchaseRatio > 1.2) tips.push("You deployed more into stock than you sold this month — watch cash flow, or draw working capital.");
  if (momGrowth < 0) tips.push("Sales dipped vs last month — a Paytm Ads push or festive offer could help.");
  if (tips.length === 0) tips.push("Healthy across the board — you likely qualify for a working-capital top-up.");

  return {
    period,
    revenue,
    purchases,
    estGrossProfit,
    marginPct,
    momGrowth,
    receivablesOpen,
    receivablesOverdue,
    growthScore: overall,
    components,
    trend,
    tips,
  };
}
