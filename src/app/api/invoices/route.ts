import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processInvoice } from "@/lib/agents/pipeline";
import { extractInvoiceText } from "@/lib/ocr";
import { storeInvoiceFile } from "@/lib/storage";
import { getCurrentMerchant } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Create a purchase invoice and run it through the agent pipeline.
 * Accepts either multipart/form-data (file upload) or JSON (manual entry / pasted text).
 */
export async function POST(req: Request) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  let ocrText = "";
  let fileUrl: string | null = null;
  let fileName: string | null = null;
  let source = "manual";
  const hints: Record<string, unknown> = {};

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      const pasted = (form.get("text") as string | null) ?? "";

      if (file && file.size > 0) {
        const buf = Buffer.from(await file.arrayBuffer());
        const stored = await storeInvoiceFile(buf, file.name, file.type || "application/octet-stream");
        fileUrl = stored.url;
        fileName = file.name;
        source = "upload";
        const ocr = await extractInvoiceText(buf, file.type || "application/octet-stream", file.name);
        ocrText = ocr.text;
      }
      if (pasted.trim()) {
        ocrText = ocrText ? `${ocrText}\n${pasted}` : pasted;
        if (!fileName) fileName = "pasted-invoice.txt";
      }
    } else {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      if (typeof body.text === "string") ocrText = body.text;
      // Manual structured fields become hints for the Intake agent.
      for (const k of ["supplierName", "supplierGstin", "invoiceNo", "taxableValue", "cgst", "sgst", "igst", "total", "hsnCode", "gstRate"]) {
        if (body[k] !== undefined && body[k] !== "" && body[k] !== null) hints[k] = body[k];
      }
      fileName = (body.fileName as string) ?? "manual-invoice.txt";
    }
  } catch (err) {
    return NextResponse.json({ error: `Bad request: ${(err as Error).message}` }, { status: 400 });
  }

  if (!ocrText.trim() && Object.keys(hints).length === 0) {
    return NextResponse.json(
      { error: "Provide an invoice file, pasted text, or manual fields." },
      { status: 400 },
    );
  }

  const invoice = await prisma.purchaseInvoice.create({
    data: {
      merchantId: merchant.id,
      source,
      fileUrl,
      fileName,
      ocrText,
      supplierName: (hints.supplierName as string) ?? null,
      supplierGstin: (hints.supplierGstin as string) ?? null,
      invoiceNo: (hints.invoiceNo as string) ?? null,
      taxableValue: hints.taxableValue != null ? Number(hints.taxableValue) : null,
      cgst: hints.cgst != null ? Number(hints.cgst) : 0,
      sgst: hints.sgst != null ? Number(hints.sgst) : 0,
      igst: hints.igst != null ? Number(hints.igst) : 0,
      total: hints.total != null ? Number(hints.total) : null,
      hsnCode: (hints.hsnCode as string) ?? null,
      gstRate: hints.gstRate != null ? Number(hints.gstRate) : null,
      status: "received",
    },
  });

  const result = await processInvoice(invoice.id);
  return NextResponse.json({ ok: true, invoiceId: invoice.id, result });
}
