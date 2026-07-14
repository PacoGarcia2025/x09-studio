import { NextResponse } from "next/server";
import { getLlmProvider } from "@/lib/llm/provider";

export const dynamic = "force-dynamic";

/**
 * Health do provider — não chama a API Gemini (evita custo).
 * Só valida se a chave está configurada.
 */
export async function GET() {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY,
  );

  try {
    const provider = getLlmProvider();
    return NextResponse.json({
      ok: true,
      provider: provider.id,
      apiKeyConfigured: hasKey,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown",
        apiKeyConfigured: hasKey,
      },
      { status: 500 },
    );
  }
}
