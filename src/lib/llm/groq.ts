import { createOpenAICompatibleProvider } from "./openai-compatible";
import type { LlmProvider } from "./types";

const GROQ_MODEL = "llama-3.3-70b-versatile";

function requireGroqKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Missing GROQ_API_KEY");
  return key;
}

export function createGroqProvider(): LlmProvider {
  return createOpenAICompatibleProvider({
    id: `groq:${GROQ_MODEL}`,
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: requireGroqKey(),
    model: GROQ_MODEL,
    defaultTemperature: 0.4,
    defaultMaxTokens: 8192,
  });
}
