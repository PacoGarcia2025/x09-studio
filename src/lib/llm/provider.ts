import type { LlmProvider } from "./types";
import type { GenerationMode } from "./types";
import { createGeminiFlashProvider } from "./gemini";
import { createGroqProvider } from "./groq";
import {
  createClaudeViaOpenRouter,
  createGeminiViaOpenRouter,
} from "./openrouter";

export type StudioLlmId =
  | "gemini-2.5-flash"
  | "gemini-openrouter"
  | "claude-sonnet"
  | "groq-llama";

export function getLlmProvider(id: StudioLlmId = "gemini-2.5-flash"): LlmProvider {
  switch (id) {
    case "gemini-2.5-flash":
      return createGeminiFlashProvider();
    case "gemini-openrouter":
      return createGeminiViaOpenRouter();
    case "claude-sonnet":
      return createClaudeViaOpenRouter();
    case "groq-llama":
      return createGroqProvider();
    default: {
      const _exhaustive: never = id;
      throw new Error(`LLM provider não suportado: ${_exhaustive}`);
    }
  }
}

/**
 * Edit/premium/repair → Claude (aplica código de verdade).
 * Plan/fast → Gemini.
 */
export function getProviderForMode(mode: GenerationMode): LlmProvider {
  try {
    switch (mode) {
      case "edit":
      case "premium":
      case "repair":
        return createClaudeViaOpenRouter();
      case "plan":
        return getFallbackFast();
      case "fast":
      default:
        return getFallbackFast();
    }
  } catch (error) {
    try {
      return createGeminiFlashProvider();
    } catch {
      throw error;
    }
  }
}

function getFallbackFast(): LlmProvider {
  if (process.env.OPENROUTER_API_KEY) {
    return createGeminiViaOpenRouter();
  }
  return createGeminiFlashProvider();
}
