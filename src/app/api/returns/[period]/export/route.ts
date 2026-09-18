import { NextResponse } from "next/server";
import { buildReturnData } from "@/lib/returns";
import { getCurrentMerchant } from "@/lib/session";

/**
 * Export the GSTR-3B draft as JSON. The shape mirrors the government portal's
 * section numbering so it can be adapted to the official offline-utility format.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ period: string }> }) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { period } = await params;

  const data = await buildReturnData(merchant.id, period);

  const portalShape = {
    gstin: data.merchant.gstin,
    ret_period: period.replace("-", ""),
    // 3.1 Details of Outward supplies
    sup_details: {
      osup_det: {
        txval: data.outwardSupplies.taxableValue,
        camt: data.outwardSupplies.cgst,
        samt: data.outwardSupplies.sgst,
        iamt: data.outwardSupplies.igst,
      },
    },
    // 4 Eligible ITC
    itc_elg: {
      itc_avl: [
        {
          ty: "OTH",
          camt: data.itc.cgst,
          samt: data.itc.sgst,
          iamt: data.itc.igst,
        },
      ],
    },
    // 5.1 Interest & late fee, nil in this draft
    intr_ltfee: { intr_details: { camt: 0, samt: 0, iamt: 0 } },
    _hisaab: {
      generatedBy: "Hisaab",
      netPayable: data.netPayable,
      itcAtRisk: data.itcAtRisk,
      blockedItc: data.itc.blocked,
      invoicesConsidered: data.invoicesConsidered,
      invoicesFlagged: data.invoicesFlagged,
      note: "Draft for human review. Not an official filing.",
    },
  };

  return new NextResponse(JSON.stringify(portalShape, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="GSTR3B-${data.merchant.gstin}-${period}.json"`,
    },
  });
}
