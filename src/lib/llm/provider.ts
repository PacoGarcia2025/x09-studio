import type { LlmProvider } from "./types";
import { createGeminiFlashProvider } from "./gemini";

export type StudioLlmId = "gemini-2.5-flash";

export function getLlmProvider(id: StudioLlmId = "gemini-2.5-flash"): LlmProvider {
  switch (id) {
    case "gemini-2.5-flash":
      return createGeminiFlashProvider();
    default: {
      const _exhaustive: never = id;
      throw new Error(`LLM provider não suportado: ${_exhaustive}`);
    }
  }
}
