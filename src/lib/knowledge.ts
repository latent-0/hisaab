import { EXPENSE_CATEGORIES } from "./constants";
import { prisma } from "./db";
import { buildReturnData } from "./returns";
import { periodLabel, recentPeriods } from "./utils";

/**
 * Turn a merchant's GST data into accurate, natural-language statements that
 * Cognee can build a knowledge graph from. Kept factual and explicit so the
 * graph answers are grounded (rates, amounts, dates, suppliers, ITC status).
 */
export async function buildMerchantKnowledge(merchantId: string): Promise<string> {
  const merchant = await prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });
  const invoices = await prisma.purchaseInvoice.findMany({
    where: { merchantId },
    orderBy: { invoiceDate: "asc" },
  });

  const lines: string[] = [];
  lines.push(
    `${merchant.businessName} is a GST-registered merchant (GSTIN ${merchant.gstin}) in ${merchant.stateName}, owned by ${merchant.ownerName}.`,
  );

  // Per-invoice facts.
  const rupee = (n: number) => `₹${Math.round(n)}`;
  const supplierAgg = new Map<string, { count: number; itc: number }>();

  for (const inv of invoices) {
    const gst = Math.round(inv.cgst + inv.sgst + inv.igst);
    const cat = inv.category ? EXPENSE_CATEGORIES[inv.category]?.label ?? inv.category : "uncategorised";
    const dateStr = inv.invoiceDate ? inv.invoiceDate.toISOString().slice(0, 10) : "an unknown date";
    const itcStr =
      inv.itcEligible === false
        ? `Input tax credit is BLOCKED (${inv.itcBlockReason ?? "ineligible under Section 17(5)"})`
        : inv.status === "approved"
          ? `Input tax credit of ${rupee(gst)} is eligible and claimed`
          : `Input tax credit of ${rupee(gst)} is eligible but pending review`;
    lines.push(
      `On ${dateStr}, ${merchant.businessName} received invoice ${inv.invoiceNo ?? "(no number)"} from supplier ${inv.supplierName ?? "unknown"} (GSTIN ${inv.supplierGstin ?? "not provided"}) for ${cat}. Taxable value ${rupee(inv.taxableValue ?? 0)} at GST rate ${inv.gstRate ?? "?"}%, total GST ${rupee(gst)}. ${itcStr}. GSTR-2B status: ${inv.gstr2bStatus}.`,
    );

    const sup = inv.supplierName ?? "Unknown supplier";
    const cur = supplierAgg.get(sup) ?? { count: 0, itc: 0 };
    supplierAgg.set(sup, { count: cur.count + 1, itc: cur.itc + (inv.itcEligible ? gst : 0) });
  }

  // Supplier rollups.
  for (const [sup, v] of supplierAgg) {
    lines.push(
      `Supplier ${sup} issued ${v.count} invoice(s) to ${merchant.businessName}, contributing ${rupee(v.itc)} of eligible input tax credit.`,
    );
  }

  // Per-period return facts (last 6 months).
  for (const p of recentPeriods(6)) {
    const d = await buildReturnData(merchantId, p);
    if (d.outwardSupplies.taxableValue === 0 && d.invoicesConsidered === 0) continue;
    lines.push(
      `In ${periodLabel(p)}, ${merchant.businessName} had taxable sales of ${rupee(d.outwardSupplies.taxableValue)}, output tax ${rupee(d.outputTax)}, claimed input tax credit ${rupee(d.itcClaimed)}, and net GST payable ${rupee(d.netPayable)}. ${d.invoicesFlagged} invoice(s) were flagged for review, with ${rupee(d.itcAtRisk)} of ITC at risk.`,
    );
  }

  return lines.join("\n");
}
