import { anthropicEngine } from "./anthropic";
import { geminiEngine } from "./gemini";
import { groqEngine } from "./groq";
import { mockEngine } from "./mock";
import type { AiEngine } from "./types";

export type { AiEngine } from "./types";

/**
 * Resolve the active AI engine from LLM_PROVIDER. Defaults to the deterministic
 * mock engine, which needs no API key. Real engines fall back to mock per-call
 * on any error, so the pipeline is always functional.
 */
export function getEngine(): AiEngine {
  const provider = (process.env.LLM_PROVIDER || "mock").toLowerCase();
  switch (provider) {
    case "anthropic":
      return anthropicEngine;
    case "gemini":
      return geminiEngine;
    case "groq":
      return groqEngine;
    case "mock":
    default:
      return mockEngine;
  }
}
