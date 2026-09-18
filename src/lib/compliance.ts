import { prisma } from "./db";
import { currentPeriod, daysUntil, periodLabel } from "./utils";

export interface ComplianceItem {
  key: string;
  title: string;
  authority: string;
  dueDate: string; // ISO date
  daysLeft: number;
  status: "filed" | "overdue" | "due_soon" | "upcoming";
  detail: string;
}

function status(daysLeft: number, filed = false): ComplianceItem["status"] {
  if (filed) return "filed";
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 7) return "due_soon";
  return "upcoming";
}

function nextQuarterlyAdvanceTax(now = new Date()): Date {
  const y = now.getFullYear();
  const marks = [new Date(y, 5, 15), new Date(y, 8, 15), new Date(y, 11, 15), new Date(y + 1, 2, 15)];
  return marks.find((d) => d.getTime() >= now.getTime()) ?? marks[marks.length - 1];
}

export async function getComplianceItems(merchantId: string): Promise<ComplianceItem[]> {
  const period = currentPeriod();
  const [y, m] = period.split("-").map(Number);
  const label = periodLabel(period);

  const gstr3b = await prisma.gstReturn.findUnique({
    where: { merchantId_period_type: { merchantId, period, type: "GSTR3B" } },
  });

  const items: ComplianceItem[] = [];

  const gstr1Due = new Date(y, m, 11);
  items.push({
    key: "gstr1",
    title: `GSTR-1 · ${label}`,
    authority: "GSTN",
    dueDate: gstr1Due.toISOString(),
    daysLeft: daysUntil(gstr1Due),
    status: status(daysUntil(gstr1Due)),
    detail: "Outward supplies (sales) statement.",
  });

  const gstr3bDue = new Date(y, m, 20);
  items.push({
    key: "gstr3b",
    title: `GSTR-3B · ${label}`,
    authority: "GSTN",
    dueDate: gstr3bDue.toISOString(),
    daysLeft: daysUntil(gstr3bDue),
    status: status(daysUntil(gstr3bDue), gstr3b?.status === "filed"),
    detail: "Summary return + tax payment. Hisaab has this drafted.",
  });

  const tdsDue = new Date(y, m, 7);
  items.push({
    key: "tds",
    title: `TDS payment · ${label}`,
    authority: "Income Tax",
    dueDate: tdsDue.toISOString(),
    daysLeft: daysUntil(tdsDue),
    status: status(daysUntil(tdsDue)),
    detail: "If you deducted TDS on rent/contractor payments.",
  });

  const adv = nextQuarterlyAdvanceTax();
  items.push({
    key: "advtax",
    title: "Advance tax instalment",
    authority: "Income Tax",
    dueDate: adv.toISOString(),
    daysLeft: daysUntil(adv),
    status: status(daysUntil(adv)),
    detail: "Quarterly advance income-tax for the business.",
  });

  const udyam = new Date(y + (m >= 3 ? 1 : 0), 2, 31);
  items.push({
    key: "udyam",
    title: "Udyam (MSME) details update",
    authority: "MSME Ministry",
    dueDate: udyam.toISOString(),
    daysLeft: daysUntil(udyam),
    status: status(daysUntil(udyam)),
    detail: "Annual turnover/ITR sync for your Udyam registration.",
  });

  return items.sort((a, b) => a.daysLeft - b.daysLeft);
}
