import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LlmCompleteInput, LlmCompleteResult, LlmProvider } from "./types";

const MODEL_ID = "gemini-2.5-flash";

function requireGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY (or GOOGLE_AI_API_KEY)");
  }
  return key;
}

export function createGeminiFlashProvider(): LlmProvider {
  return {
    id: MODEL_ID,
    async complete(input: LlmCompleteInput): Promise<LlmCompleteResult> {
      const genAI = new GoogleGenerativeAI(requireGeminiApiKey());
      const model = genAI.getGenerativeModel({
        model: MODEL_ID,
        generationConfig: {
          temperature: input.temperature ?? 0.4,
          maxOutputTokens: input.maxOutputTokens ?? 8192,
          ...(input.responseJsonSchema
            ? { responseMimeType: "application/json" as const }
            : {}),
        },
      });

      const system = input.messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n\n");

      const history = input.messages.filter((m) => m.role !== "system");
      const contents = history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const result = await model.generateContent({
        contents:
          contents.length > 0
            ? contents
            : [{ role: "user", parts: [{ text: "..." }] }],
        systemInstruction: system || undefined,
      });

      const text = result.response.text();
      const usage = result.response.usageMetadata;

      return {
        text,
        model: MODEL_ID,
        usage: {
          inputTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
        },
      };
    },
  };
}
