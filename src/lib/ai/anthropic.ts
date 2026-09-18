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

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

async function callClaude(system: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  // Dynamic import so the dependency is only loaded when actually used.
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: key });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = res.content.find((c) => c.type === "text");
  return block && "text" in block ? block.text : "";
}

/**
 * Claude-backed engine. Every method degrades gracefully to the deterministic
 * mock engine if the API key is missing or a call fails, so nothing ever breaks.
 */
export const anthropicEngine: AiEngine = {
  name: "anthropic",

  async intake(input: IntakeInput): Promise<IntakeResult> {
    try {
      const out = await callClaude(INTAKE_SYSTEM, intakeUserPrompt(input));
      const parsed = intakeSchema.parse(extractJson(out));
      return { ...parsed, confidence: clamp01(parsed.confidence) } as IntakeResult;
    } catch (err) {
      console.warn("[anthropic.intake] falling back to mock:", (err as Error).message);
      return mockEngine.intake(input);
    }
  },

  async classify(input: ClassifyInput): Promise<ClassifyResult> {
    try {
      const out = await callClaude(CLASSIFY_SYSTEM, classifyUserPrompt(input));
      const parsed = classifySchema.parse(extractJson(out));
      // Guard against hallucinated categories.
      if (!EXPENSE_CATEGORIES[parsed.category]) return mockEngine.classify(input);
      return { ...parsed, confidence: clamp01(parsed.confidence) };
    } catch (err) {
      console.warn("[anthropic.classify] falling back to mock:", (err as Error).message);
      return mockEngine.classify(input);
    }
  },

  async answer(input: AnswerInput): Promise<AnswerResult> {
    try {
      const out = await callClaude(ANSWER_SYSTEM, answerUserPrompt(input));
      return answerSchema.parse(extractJson(out));
    } catch (err) {
      console.warn("[anthropic.answer] falling back to mock:", (err as Error).message);
      return mockEngine.answer(input);
    }
  },
};
