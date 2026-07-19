import type { LlmProvider } from "./types";
import type { GenerationMode } from "./types";
import { createGeminiFlashProvider } from "./gemini";
import { createGroqProvider } from "./groq";
import {
  createClaudeViaOpenRouter,
  createGeminiViaOpenRouter,
} from "./openrouter";
import { createResilientFastProvider } from "./resilient";

export type StudioLlmId =
  | "gemini-2.5-flash"
  | "gemini-openrouter"
  | "claude-sonnet"
  | "groq-llama"
  | "resilient-fast";

export function getLlmProvider(
  id: StudioLlmId = "resilient-fast",
): LlmProvider {
  switch (id) {
    case "resilient-fast":
      return createResilientFastProvider();
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
 * Plan/fast → Gemini com fallback (OpenRouter / Groq).
 */
export function getProviderForMode(mode: GenerationMode): LlmProvider {
  try {
    switch (mode) {
      case "edit":
      case "premium":
      case "repair":
        return createClaudeViaOpenRouter();
      case "plan":
        return createResilientFastProvider();
      case "fast":
      default:
        return createResilientFastProvider();
    }
  } catch (error) {
    try {
      return createResilientFastProvider();
    } catch {
      throw error;
    }
  }
}
