import { createOpenAICompatibleProvider } from "./openai-compatible";
import type { LlmProvider } from "./types";

export function createOpenAIProvider(
  model = "gpt-4.1-mini",
): LlmProvider {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  return createOpenAICompatibleProvider({
    id: `openai:${model}`,
    baseUrl: "https://api.openai.com/v1",
    apiKey: key,
    model,
    defaultTemperature: 0.4,
    defaultMaxTokens: 8192,
  });
}
