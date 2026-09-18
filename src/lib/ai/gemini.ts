import { EXPENSE_CATEGORIES } from "../constants";
import type { ClassifyResult, IntakeResult } from "../types";
import { clamp01 } from "../utils";
import { mockEngine } from "./mock";
import {
  ANSWER_SYSTEM,
  CLASSIFY_SYSTEM,
  INTAKE_SYSTEM,
  NOTICE_SYSTEM,
  answerSchema,
  answerUserPrompt,
  classifySchema,
  classifyUserPrompt,
  extractJson,
  intakeSchema,
  intakeUserPrompt,
  noticeSchema,
  noticeUserPrompt,
} from "./prompts";
import type { AiEngine, AnswerInput, AnswerResult, ClassifyInput, ExplainNoticeInput, IntakeInput } from "./types";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

async function callGemini(system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });
  const res = await model.generateContent(user);
  return res.response.text();
}

/** Gemini-backed engine (uses Google Cloud credits). Falls back to mock. */
export const geminiEngine: AiEngine = {
  name: "gemini",

  async intake(input: IntakeInput): Promise<IntakeResult> {
    try {
      const out = await callGemini(INTAKE_SYSTEM, intakeUserPrompt(input));
      const parsed = intakeSchema.parse(extractJson(out));
      return { ...parsed, confidence: clamp01(parsed.confidence) } as IntakeResult;
    } catch (err) {
      console.warn("[gemini.intake] falling back to mock:", (err as Error).message);
      return mockEngine.intake(input);
    }
  },

  async classify(input: ClassifyInput): Promise<ClassifyResult> {
    try {
      const out = await callGemini(CLASSIFY_SYSTEM, classifyUserPrompt(input));
      const parsed = classifySchema.parse(extractJson(out));
      if (!EXPENSE_CATEGORIES[parsed.category]) return mockEngine.classify(input);
      return { ...parsed, confidence: clamp01(parsed.confidence) };
    } catch (err) {
      console.warn("[gemini.classify] falling back to mock:", (err as Error).message);
      return mockEngine.classify(input);
    }
  },

  async answer(input: AnswerInput): Promise<AnswerResult> {
    try {
      const out = await callGemini(ANSWER_SYSTEM, answerUserPrompt(input));
      return answerSchema.parse(extractJson(out));
    } catch (err) {
      console.warn("[gemini.answer] falling back to mock:", (err as Error).message);
      return mockEngine.answer(input);
    }
  },

  async explainNotice(input: ExplainNoticeInput) {
    try {
      const out = await callGemini(NOTICE_SYSTEM, noticeUserPrompt(input));
      return noticeSchema.parse(extractJson(out));
    } catch (err) {
      console.warn("[gemini.explainNotice] falling back to mock:", (err as Error).message);
      return mockEngine.explainNotice(input);
    }
  },
};
