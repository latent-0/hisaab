import { REVIEW_CONFIDENCE_THRESHOLD } from "../constants";
import { prisma } from "../db";
import { getEngine } from "../ai";
import { getGstr2bAdapter } from "../adapters/gstr2b";
import type { AgentStepTrace } from "../types";
import { clamp01, currentPeriod, isValidGstinFormat, round2 } from "../utils";

interface ProcessResult {
  invoiceId: string;
  status: string;
  confidence: number;
  claimableItc: number;
  steps: AgentStepTrace[];
  reviewTasks: number;
}

/**
 * Run the Hisaab agent pipeline over a single purchase invoice:
 *   Intake  → Classify → Cross-Check → Calculate
 * (Generate runs at the period level in src/lib/returns.ts.)
 *
 * The function is idempotent: re-running re-derives everything and refreshes the
 * invoice's open review tasks.
 */
export async function processInvoice(invoiceId: string): Promise<ProcessResult> {
  const engine = getEngine();
  const gstr2b = getGstr2bAdapter();
  const steps: AgentStepTrace[] = [];

  const invoice = await prisma.purchaseInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  const run = await prisma.agentRun.create({
    data: {
      merchantId: invoice.merchantId,
      invoiceId,
      status: "running",
      provider: engine.name,
      steps: "[]",
    },
  });

  await prisma.purchaseInvoice.update({
    where: { id: invoiceId },
    data: { status: "processing" },
  });

  const timed = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
    const t = Date.now();
    const r = await fn();
    return [r, Date.now() - t];
  };

  // --- 1. INTAKE ------------------------------------------------------------
  const [intake, intakeMs] = await timed(() =>
    engine.intake({
      ocrText: invoice.ocrText ?? "",
      fileName: invoice.fileName,
      hints: {
        supplierName: invoice.supplierName ?? undefined,
        supplierGstin: invoice.supplierGstin ?? undefined,
        invoiceNo: invoice.invoiceNo ?? undefined,
        taxableValue: invoice.taxableValue || undefined,
        // 0 means "not provided yet" — let Intake parse from the document.
        cgst: invoice.cgst || undefined,
        sgst: invoice.sgst || undefined,
        igst: invoice.igst || undefined,
        total: invoice.total || undefined,
        hsnCode: invoice.hsnCode ?? undefined,
        gstRate: (invoice.gstRate as never) || undefined,
      },
    }),
  );
  steps.push({
    agent: "intake",
    label: "Intake",
    status: intake.confidence < 0.6 ? "review" : "ok",
    confidence: intake.confidence,
    summary: intake.notes,
    durationMs: intakeMs,
    provider: engine.name,
  });

  const invoiceDate = intake.invoiceDate ? new Date(intake.invoiceDate) : invoice.invoiceDate;
  const period = invoiceDate
    ? `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}`
    : currentPeriod();

  // --- 2. CLASSIFY ----------------------------------------------------------
  const invoiceText = invoice.ocrText || [intake.supplierName, intake.hsnCode].filter(Boolean).join(" ");
  const [cls, clsMs] = await timed(() =>
    engine.classify({
      supplierName: intake.supplierName,
      invoiceText,
      hsnCode: intake.hsnCode,
      taxableValue: intake.taxableValue,
      gstRate: intake.gstRate,
    }),
  );
  steps.push({
    agent: "classify",
    label: "Classify",
    status: cls.confidence < 0.6 ? "review" : "ok",
    confidence: cls.confidence,
    summary: `${cls.category} · ${cls.itcEligible ? "ITC eligible" : "ITC blocked"} — ${cls.reasoning}`,
    durationMs: clsMs,
    provider: engine.name,
  });

  // --- 3. CROSS-CHECK -------------------------------------------------------
  const issues: Array<{
    kind: "low_confidence" | "gstr2b_mismatch" | "itc_blocked" | "missing_gstin" | "duplicate";
    severity: "low" | "medium" | "high";
    title: string;
    detail: string;
    suggestion?: string;
  }> = [];

  const [match, ccMs] = await timed(() =>
    gstr2b.lookup({
      supplierGstin: intake.supplierGstin,
      invoiceNo: intake.invoiceNo,
      taxableValue: intake.taxableValue,
    }),
  );

  if (!intake.supplierGstin) {
    issues.push({
      kind: "missing_gstin",
      severity: "high",
      title: "Missing supplier GSTIN",
      detail: "This invoice has no supplier GSTIN, so ITC cannot be claimed until it's added.",
      suggestion: "Ask the supplier for a GST-compliant invoice with their GSTIN.",
    });
  } else if (!isValidGstinFormat(intake.supplierGstin)) {
    issues.push({
      kind: "missing_gstin",
      severity: "high",
      title: "Invalid supplier GSTIN",
      detail: `"${intake.supplierGstin}" is not a valid GSTIN format.`,
      suggestion: "Re-check the GSTIN with the supplier.",
    });
  }

  if (match.status === "mismatch") {
    issues.push({
      kind: "gstr2b_mismatch",
      severity: "high",
      title: "GSTR-2B value mismatch",
      detail: match.detail,
      suggestion: "Contact the supplier to correct their GSTR-1, or claim only the matched value.",
    });
  } else if (match.status === "missing") {
    issues.push({
      kind: "gstr2b_mismatch",
      severity: "medium",
      title: "Not in GSTR-2B yet",
      detail: match.detail,
      suggestion: "Provisional claim carries risk. Follow up with the supplier before filing.",
    });
  }

  // Blocked ITC (Sec 17(5)) is handled confidently — we simply exclude the
  // credit and surface it on the invoice; it does not need human review unless
  // extraction confidence is otherwise low.

  // Duplicate detection within the merchant's invoices.
  if (intake.supplierGstin && intake.invoiceNo) {
    const dup = await prisma.purchaseInvoice.findFirst({
      where: {
        merchantId: invoice.merchantId,
        supplierGstin: intake.supplierGstin,
        invoiceNo: intake.invoiceNo,
        id: { not: invoiceId },
      },
    });
    if (dup) {
      issues.push({
        kind: "duplicate",
        severity: "high",
        title: "Possible duplicate invoice",
        detail: `Invoice ${intake.invoiceNo} from this supplier already exists (id ${dup.id.slice(0, 8)}).`,
        suggestion: "Claiming the same invoice twice is a compliance risk. Reject one copy.",
      });
    }
  }

  const ccConfidence = clamp01(
    match.status === "matched" ? 0.95 : match.status === "missing" ? 0.7 : 0.5,
  );
  steps.push({
    agent: "crosscheck",
    label: "Cross-Check",
    status: issues.some((i) => i.severity === "high") ? "review" : match.status === "matched" ? "ok" : "review",
    confidence: ccConfidence,
    summary: `GSTR-2B: ${match.status}. ${issues.length} issue(s) found.`,
    durationMs: ccMs,
    provider: "sandbox-gstr2b",
  });

  // --- 4. CALCULATE ---------------------------------------------------------
  const gstAmount = round2(intake.cgst + intake.sgst + intake.igst);
  const matched = match.status === "matched";
  const claimableItc = cls.itcEligible && matched ? gstAmount : 0;

  const overallConfidence = clamp01(
    Math.min(intake.confidence, cls.confidence, ccConfidence),
  );
  const needsReview = issues.length > 0 || overallConfidence < REVIEW_CONFIDENCE_THRESHOLD;

  steps.push({
    agent: "calculate",
    label: "Calculate",
    status: needsReview ? "review" : "ok",
    confidence: overallConfidence,
    summary: `Claimable ITC: ₹${claimableItc}. ${needsReview ? "Routed to human review." : "Auto-approved."}`,
    durationMs: 1,
    provider: "engine",
  });

  // --- Persist --------------------------------------------------------------
  const status = needsReview ? "needs_review" : "approved";

  await prisma.purchaseInvoice.update({
    where: { id: invoiceId },
    data: {
      supplierName: intake.supplierName,
      supplierGstin: intake.supplierGstin,
      invoiceNo: intake.invoiceNo,
      invoiceDate,
      taxableValue: intake.taxableValue,
      cgst: intake.cgst,
      sgst: intake.sgst,
      igst: intake.igst,
      total: intake.total,
      hsnCode: intake.hsnCode,
      gstRate: intake.gstRate,
      category: cls.category,
      itcEligible: cls.itcEligible,
      itcBlockReason: cls.itcBlockReason,
      gstr2bStatus: match.status,
      matchNotes: match.detail,
      confidence: overallConfidence,
      status,
      period,
    },
  });

  // Refresh review tasks for this invoice.
  await prisma.reviewTask.deleteMany({ where: { invoiceId, status: "open" } });
  if (issues.length || overallConfidence < REVIEW_CONFIDENCE_THRESHOLD) {
    const toCreate = [...issues];
    if (overallConfidence < REVIEW_CONFIDENCE_THRESHOLD && !issues.length) {
      toCreate.push({
        kind: "low_confidence",
        severity: "medium",
        title: "Low confidence extraction",
        detail: "The model wasn't confident reading this invoice. Please verify the fields.",
        suggestion: "Open the invoice and confirm supplier, amounts and GST.",
      });
    }
    await prisma.reviewTask.createMany({
      data: toCreate.map((i) => ({
        merchantId: invoice.merchantId,
        invoiceId,
        kind: i.kind,
        severity: i.severity,
        title: i.title,
        detail: i.detail,
        suggestion: i.suggestion ?? null,
      })),
    });
  }

  await prisma.agentRun.update({
    where: { id: run.id },
    data: { status: "completed", steps: JSON.stringify(steps), finishedAt: new Date() },
  });

  return {
    invoiceId,
    status,
    confidence: overallConfidence,
    claimableItc,
    steps,
    reviewTasks: issues.length,
  };
}
