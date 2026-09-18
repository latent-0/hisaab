import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processInvoice } from "@/lib/agents/pipeline";
import { getCurrentMerchant } from "@/lib/session";

async function ownedInvoice(id: string, merchantId: string) {
  const inv = await prisma.purchaseInvoice.findUnique({ where: { id } });
  if (!inv || inv.merchantId !== merchantId) return null;
  return inv;
}

/** Actions: reprocess | approve | reject, plus manual field edits. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const inv = await ownedInvoice(id, merchant.id);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { action?: string; fields?: Record<string, unknown> };

  if (body.action === "reprocess") {
    const result = await processInvoice(id);
    return NextResponse.json({ ok: true, result });
  }

  if (body.action === "approve") {
    await prisma.purchaseInvoice.update({ where: { id }, data: { status: "approved" } });
    await prisma.reviewTask.updateMany({
      where: { invoiceId: id, status: "open" },
      data: { status: "resolved", resolvedBy: merchant.ownerName, resolvedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reject") {
    await prisma.purchaseInvoice.update({ where: { id }, data: { status: "rejected" } });
    await prisma.reviewTask.updateMany({
      where: { invoiceId: id, status: "open" },
      data: { status: "resolved", resolvedBy: merchant.ownerName, resolvedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  // Manual field edits, then re-run the pipeline to re-derive downstream state.
  if (body.fields) {
    const f = body.fields;
    await prisma.purchaseInvoice.update({
      where: { id },
      data: {
        supplierName: (f.supplierName as string) ?? inv.supplierName,
        supplierGstin: (f.supplierGstin as string) ?? inv.supplierGstin,
        invoiceNo: (f.invoiceNo as string) ?? inv.invoiceNo,
        taxableValue: f.taxableValue != null ? Number(f.taxableValue) : inv.taxableValue,
        cgst: f.cgst != null ? Number(f.cgst) : inv.cgst,
        sgst: f.sgst != null ? Number(f.sgst) : inv.sgst,
        igst: f.igst != null ? Number(f.igst) : inv.igst,
        gstRate: f.gstRate != null ? Number(f.gstRate) : inv.gstRate,
      },
    });
    const result = await processInvoice(id);
    return NextResponse.json({ ok: true, result });
  }

  return NextResponse.json({ error: "No action" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const inv = await ownedInvoice(id, merchant.id);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.purchaseInvoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
