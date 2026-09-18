import { EXPENSE_CATEGORIES } from "../constants";
import type { ClassifyResult, IntakeResult } from "../types";
import { clamp01 } from "../utils";
import { mockEngine } from "./mock";
import {
  ANSWER_SYSTEM,
  CLASSIFY_SYSTEM,
  INTAKE_SYSTEM,
  answerSchema,
  answerUserPrompt,
  classifySchema,
  classifyUserPrompt,
  extractJson,
  intakeSchema,
  intakeUserPrompt,
} from "./prompts";
import type { AiEngine, AnswerInput, AnswerResult, ClassifyInput, IntakeInput } from "./types";

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq(system: string, user: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_completion_tokens: 1024,
    }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

/** Groq-backed engine (fast OpenAI-compatible inference). Falls back to mock. */
export const groqEngine: AiEngine = {
  name: "groq",

  async intake(input: IntakeInput): Promise<IntakeResult> {
    try {
      const out = await callGroq(INTAKE_SYSTEM, intakeUserPrompt(input));
      const parsed = intakeSchema.parse(extractJson(out));
      return { ...parsed, confidence: clamp01(parsed.confidence) } as IntakeResult;
    } catch (err) {
      console.warn("[groq.intake] falling back to mock:", (err as Error).message);
      return mockEngine.intake(input);
    }
  },

  async classify(input: ClassifyInput): Promise<ClassifyResult> {
    try {
      const out = await callGroq(CLASSIFY_SYSTEM, classifyUserPrompt(input));
      const parsed = classifySchema.parse(extractJson(out));
      if (!EXPENSE_CATEGORIES[parsed.category]) return mockEngine.classify(input);
      return { ...parsed, confidence: clamp01(parsed.confidence) };
    } catch (err) {
      console.warn("[groq.classify] falling back to mock:", (err as Error).message);
      return mockEngine.classify(input);
    }
  },

  async answer(input: AnswerInput): Promise<AnswerResult> {
    try {
      const out = await callGroq(ANSWER_SYSTEM, answerUserPrompt(input));
      return answerSchema.parse(extractJson(out));
    } catch (err) {
      console.warn("[groq.answer] falling back to mock:", (err as Error).message);
      return mockEngine.answer(input);
    }
  },
};
