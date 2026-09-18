import { z } from "zod";
import { EXPENSE_CATEGORIES } from "../constants";
import type { AnswerInput, ClassifyInput, ExplainNoticeInput, IntakeInput } from "./types";

const categoryKeys = Object.keys(EXPENSE_CATEGORIES);

export const intakeSchema = z.object({
  supplierName: z.string().nullable(),
  supplierGstin: z.string().nullable(),
  invoiceNo: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  taxableValue: z.number().nullable(),
  cgst: z.number(),
  sgst: z.number(),
  igst: z.number(),
  total: z.number().nullable(),
  hsnCode: z.string().nullable(),
  gstRate: z.number().nullable(),
  confidence: z.number(),
  notes: z.string(),
});

export const classifySchema = z.object({
  category: z.string(),
  itcEligible: z.boolean(),
  itcBlockReason: z.string().nullable(),
  confidence: z.number(),
  reasoning: z.string(),
});

export const answerSchema = z.object({
  intent: z.string(),
  answerText: z.string(),
});

export const INTAKE_SYSTEM = `You are the Intake agent in Hisaab, a GST copilot for Indian merchants.
Extract structured fields from a purchase-invoice's raw text.
Return ONLY strict JSON matching this shape (no markdown, no prose):
{
  "supplierName": string|null,
  "supplierGstin": string|null,   // 15-char GSTIN, uppercase, or null
  "invoiceNo": string|null,
  "invoiceDate": string|null,     // ISO "YYYY-MM-DD"
  "taxableValue": number|null,    // amount before GST
  "cgst": number, "sgst": number, "igst": number,
  "total": number|null,           // grand total incl. GST
  "hsnCode": string|null,
  "gstRate": number|null,         // one of 0,5,12,18,28
  "confidence": number,           // 0..1
  "notes": string
}
Rupee amounts are plain numbers (no symbols/commas). If a field is unreadable, use null.`;

export function intakeUserPrompt(input: IntakeInput): string {
  return `Invoice file: ${input.fileName ?? "unknown"}
Known hints (may be empty): ${JSON.stringify(input.hints ?? {})}
--- RAW INVOICE TEXT ---
${input.ocrText.slice(0, 6000)}
--- END ---
Return the JSON now.`;
}

export const CLASSIFY_SYSTEM = `You are the Classify agent in Hisaab, a GST copilot for Indian merchants.
Assign a purchase invoice to exactly one expense category and decide whether the
buyer can claim Input Tax Credit (ITC) under Indian GST law. Blocked credits fall
under Section 17(5) (e.g. food & beverage, motor vehicles for personal use,
personal consumption). Choose category from this list ONLY:
${categoryKeys.join(", ")}.
Return ONLY strict JSON:
{"category": string, "itcEligible": boolean, "itcBlockReason": string|null, "confidence": number, "reasoning": string}`;

export function classifyUserPrompt(input: ClassifyInput): string {
  return `Supplier: ${input.supplierName ?? "unknown"}
HSN: ${input.hsnCode ?? "unknown"} | GST rate: ${input.gstRate ?? "unknown"} | Taxable: ${input.taxableValue ?? "unknown"}
Invoice text (truncated):
${input.invoiceText.slice(0, 2500)}
Return the JSON now.`;
}

export const ANSWER_SYSTEM = `You are Hisaab's voice assistant for an Indian merchant.
Answer the merchant's spoken question about their GST in ONE or TWO short,
warm sentences. Use the exact figures from the provided facts (already in INR).
Reply in the requested language. Never invent numbers not in the facts.
Return ONLY strict JSON: {"intent": string, "answerText": string}`;

export function answerUserPrompt(input: AnswerInput): string {
  return `Language: ${input.language}
Filing period: ${input.period}
Facts (INR values): ${JSON.stringify(input.facts)}
Merchant asked: "${input.question}"
Return the JSON now.`;
}

export const noticeSchema = z.object({
  title: z.string(),
  summary: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  steps: z.array(z.string()),
  deadlineHint: z.string().nullable().optional(),
});

export const NOTICE_SYSTEM = `You are Hisaab's GST notice assistant for a small Indian merchant.
Explain a GST / tax notice in plain, calm language a non-expert understands, and
give concrete next steps. Return ONLY strict JSON:
{"title": string, "summary": string, "severity": "low"|"medium"|"high", "steps": string[], "deadlineHint": string|null}
"severity" reflects urgency (a show-cause/demand/DRC is high; a routine mismatch is medium).
Reply in the requested language. Do not invent specific figures or dates not present in the notice.`;

export function noticeUserPrompt(input: ExplainNoticeInput): string {
  return `Language: ${input.language}
--- NOTICE TEXT ---
${input.notice.slice(0, 4000)}
--- END ---
Return the JSON now.`;
}

/** Pull the first balanced JSON object out of a model's text response. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
