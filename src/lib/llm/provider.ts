import type { LlmProvider } from "./types";
import type { GenerationMode } from "./types";
import { createGeminiFlashProvider } from "./gemini";
import { createGroqProvider } from "./groq";
import { createOpenAIProvider } from "./openai";
import {
  createClaudeViaOpenRouter,
  createGeminiViaOpenRouter,
} from "./openrouter";
import { createResilientFastProvider } from "./resilient";
import { routeModelForTask } from "@/lib/model-router";
import type { ModelRouteInput } from "@/lib/model-router/types";

export type StudioLlmId =
  | "gemini-2.5-flash"
  | "gemini-openrouter"
  | "claude-sonnet"
  | "groq-llama"
  | "openai-gpt-4.1-mini"
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
    case "openai-gpt-4.1-mini":
      return createOpenAIProvider("gpt-4.1-mini");
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
export function getProviderForMode(
  mode: GenerationMode,
  taskContext?: Partial<ModelRouteInput>,
): LlmProvider {
  try {
    const request = taskContext?.request ?? "";
    const derived = taskContext
      ? routeModelForTask({
          request,
          taskType: taskContext.taskType,
          complexity: taskContext.complexity,
          projectState: taskContext.projectState,
          contextMetrics: taskContext.contextMetrics,
          repairIssues: taskContext.repairIssues,
          repairCycles: taskContext.repairCycles,
          userModelPreference: taskContext.userModelPreference,
          budget: taskContext.budget,
        })
      : null;

    if (derived) {
      const tier = derived.tier;

      if (tier === "ECONOMIC") {
        try {
          return createGroqProvider();
        } catch {
          try {
            return createGeminiViaOpenRouter();
          } catch {
            return createResilientFastProvider();
          }
        }
      }

      if (tier === "BALANCED") {
        try {
          return createGeminiViaOpenRouter();
        } catch {
          try {
            return createGroqProvider();
          } catch {
            return createResilientFastProvider();
          }
        }
      }

      try {
        return createClaudeViaOpenRouter();
      } catch {
        try {
          return createGeminiViaOpenRouter();
        } catch {
          return createResilientFastProvider();
        }
      }
    }

    switch (mode) {
      case "edit":
      case "premium":
      case "repair":
        try {
          return createClaudeViaOpenRouter();
        } catch {
          return createResilientFastProvider();
        }
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
