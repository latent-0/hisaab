// Shared domain types (the shapes we serialize into JSON string columns and
// pass across the API boundary).

import type { GstRate, Gstr2bStatus, InvoiceStatus, ReviewKind } from "./constants";

/** Structured invoice fields produced by the Intake agent. */
export interface IntakeResult {
  supplierName: string | null;
  supplierGstin: string | null;
  invoiceNo: string | null;
  invoiceDate: string | null; // ISO date
  taxableValue: number | null;
  cgst: number;
  sgst: number;
  igst: number;
  total: number | null;
  hsnCode: string | null;
  gstRate: GstRate | null;
  confidence: number; // 0..1
  notes: string;
}

/** Classification produced by the Classify agent. */
export interface ClassifyResult {
  category: string;
  itcEligible: boolean;
  itcBlockReason: string | null;
  confidence: number;
  reasoning: string;
}

/** GSTR-2B cross-check produced by the Cross-Check agent. */
export interface CrossCheckResult {
  gstr2bStatus: Gstr2bStatus;
  matchNotes: string;
  confidence: number;
  issues: Array<{ kind: ReviewKind; severity: "low" | "medium" | "high"; detail: string }>;
}

/** One step's trace, stored on AgentRun.steps. */
export interface AgentStepTrace {
  agent: "intake" | "classify" | "crosscheck" | "calculate" | "generate";
  label: string;
  status: "ok" | "review" | "error";
  confidence: number;
  summary: string;
  durationMs: number;
  provider: string;
}

/** Per-rate breakdown line for a GSTR-3B draft. */
export interface RateBreakdown {
  rate: GstRate;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
}

/** The computed GSTR-3B payload stored on GstReturn.data. */
export interface GstReturnData {
  period: string;
  merchant: { businessName: string; gstin: string; stateName: string };
  // 3.1(a) Outward taxable supplies
  outwardSupplies: {
    total: RateBreakdown[];
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
  };
  // 4 Eligible ITC
  itc: {
    total: RateBreakdown[];
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    blocked: number; // ITC value that is blocked (Sec 17(5))
  };
  // 5.1 Net tax payable
  netLiability: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
  // Convenience headline numbers
  outputTax: number;
  itcClaimed: number;
  netPayable: number;
  itcAtRisk: number; // ITC blocked by unresolved 2B mismatches
  invoicesConsidered: number;
  invoicesFlagged: number;
  generatedAt: string;
}

export interface InvoiceSummaryDTO {
  id: string;
  supplierName: string | null;
  supplierGstin: string | null;
  invoiceNo: string | null;
  invoiceDate: string | null;
  total: number | null;
  taxableValue: number | null;
  gstAmount: number;
  category: string | null;
  itcEligible: boolean | null;
  gstr2bStatus: Gstr2bStatus;
  status: InvoiceStatus;
  confidence: number;
  period: string | null;
  fileName: string | null;
}

export interface DashboardStats {
  period: string;
  unclaimedItc: number;
  itcThisMonth: number;
  outputTax: number;
  netPayable: number;
  flaggedCount: number;
  invoiceCount: number;
  salesCount: number;
  salesTotal: number;
  reviewOpen: number;
}
