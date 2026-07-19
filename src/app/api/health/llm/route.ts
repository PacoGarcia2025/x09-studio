import { NextResponse } from "next/server";
import { getLlmProvider } from "@/lib/llm/provider";
import { listFastProviders, llmKeysStatus } from "@/lib/llm/resilient";

export const dynamic = "force-dynamic";

/**
 * Health do LLM — mostra quais chaves existem e a ordem de fallback.
 * Não chama APIs externas (sem custo).
 */
export async function GET() {
  const keys = llmKeysStatus();
  const chain = listFastProviders().map((p) => p.id);

  try {
    const provider = getLlmProvider();
    return NextResponse.json({
      ok: chain.length > 0,
      provider: provider.id,
      keys,
      fallbackChain: chain,
      hint:
        keys.openrouter || keys.groq || keys.openai
          ? "OpenRouter/Groq/OpenAI detectados — Gemini direto só como último recurso."
          : "Só Gemini detectado. Adicione OPENROUTER_API_KEY no .env e pm2 restart x09-studio --update-env",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown",
        keys,
        fallbackChain: chain,
      },
      { status: 500 },
    );
  }
}
