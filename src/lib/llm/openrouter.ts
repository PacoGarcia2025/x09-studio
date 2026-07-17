import { createOpenAICompatibleProvider } from "./openai-compatible";
import type { LlmProvider } from "./types";

function requireOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Missing OPENROUTER_API_KEY");
  return key;
}

export function createOpenRouterProvider(model: string): LlmProvider {
  return createOpenAICompatibleProvider({
    id: `openrouter:${model}`,
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: requireOpenRouterKey(),
    model,
    defaultHeaders: {
      "HTTP-Referer": process.env.STUDIO_PUBLISH_DOMAIN
        ? `https://${process.env.STUDIO_PUBLISH_DOMAIN}`
        : "http://localhost:3000",
      "X-Title": "x09 Studio",
    },
  });
}

export function createGeminiViaOpenRouter(): LlmProvider {
  return createOpenRouterProvider("google/gemini-2.5-flash");
}

export function createClaudeViaOpenRouter(): LlmProvider {
  return createOpenRouterProvider("anthropic/claude-sonnet-4.5");
}
