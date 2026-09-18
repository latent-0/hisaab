import type { ClassifyResult, IntakeResult } from "../types";

export interface IntakeInput {
  ocrText: string;
  fileName?: string | null;
  /** Optional structured hints already known (from manual entry). */
  hints?: Partial<IntakeResult>;
}

export interface ClassifyInput {
  supplierName: string | null;
  invoiceText: string;
  hsnCode: string | null;
  taxableValue: number | null;
  gstRate: number | null;
}

export interface AnswerInput {
  question: string;
  language: string; // en | hi | ...
  period: string;
  facts: Record<string, unknown>; // dashboard stats + context the model can cite
}

export interface AnswerResult {
  intent: string;
  answerText: string;
}

/**
 * Task-level AI engine. The "mock" implementation is a deterministic rule-based
 * engine that requires no API key. Real providers (Claude / Gemini) prompt an
 * LLM and fall back to the mock engine's result on any error, so the app is
 * always functional regardless of configuration.
 */
export interface AiEngine {
  readonly name: string;
  intake(input: IntakeInput): Promise<IntakeResult>;
  classify(input: ClassifyInput): Promise<ClassifyResult>;
  answer(input: AnswerInput): Promise<AnswerResult>;
}
