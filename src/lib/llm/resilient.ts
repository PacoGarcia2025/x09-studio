import type {
  LlmCompleteInput,
  LlmCompleteResult,
  LlmProvider,
} from "@/lib/llm/types";
import { createGeminiFlashProvider } from "@/lib/llm/gemini";
import { createGroqProvider } from "@/lib/llm/groq";
import { createGeminiViaOpenRouter } from "@/lib/llm/openrouter";

export function isLlmQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /\b429\b/.test(message) ||
    /Too Many Requests/i.test(message) ||
    /RESOURCE_EXHAUSTED/i.test(message) ||
    /exceeded your current quota/i.test(message) ||
    /quota/i.test(message)
  );
}

export function isLlmTransientError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    isLlmQuotaError(err) ||
    /\b503\b/.test(message) ||
    /Service Unavailable/i.test(message) ||
    /high demand/i.test(message) ||
    /UNAVAILABLE/i.test(message)
  );
}

/** Mensagem amigável para o chat (sem stack do Google). */
export function formatLlmUserError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (isLlmQuotaError(err)) {
    return "A IA atingiu o limite de uso no momento (cota do Gemini). Aguarde 1–2 minutos e tente de novo.";
  }

  if (/\b503\b|Service Unavailable|high demand/i.test(message)) {
    return "A IA está temporariamente sobrecarregada. Tente de novo em instantes.";
  }

  if (/Missing .+API_KEY/i.test(message)) {
    return "A chave da IA não está configurada no servidor. Avise o administrador.";
  }

  // Evita dump técnico enorme no chat
  const short = message.replace(/\s+/g, " ").trim().slice(0, 180);
  return short || "Falha ao falar com a IA.";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Lista de providers para plano/build rápido, com fallback automático.
 * Ordem: OpenRouter (se houver) → Gemini direto → Groq (se houver).
 */
export function listFastProviders(): LlmProvider[] {
  const list: LlmProvider[] = [];

  if (process.env.OPENROUTER_API_KEY) {
    try {
      list.push(createGeminiViaOpenRouter());
    } catch {
      // ignore
    }
  }

  try {
    list.push(createGeminiFlashProvider());
  } catch {
    // ignore
  }

  if (process.env.GROQ_API_KEY) {
    try {
      list.push(createGroqProvider());
    } catch {
      // ignore
    }
  }

  return list;
}

/**
 * Provider que troca de backend ao bater em 429/quota.
 */
export function createResilientFastProvider(): LlmProvider {
  const providers = listFastProviders();
  if (providers.length === 0) {
    throw new Error("Nenhum provider de IA configurado (GEMINI_API_KEY / OPENROUTER_API_KEY).");
  }

  return {
    id: `resilient:${providers.map((p) => p.id).join("|")}`,
    async complete(input: LlmCompleteInput): Promise<LlmCompleteResult> {
      let lastError: unknown;

      for (let i = 0; i < providers.length; i += 1) {
        const provider = providers[i]!;
        // Até 2 tentativas no mesmo provider em erro transitório
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            return await provider.complete(input);
          } catch (err) {
            lastError = err;
            if (isLlmQuotaError(err)) break; // troca de provider
            if (!isLlmTransientError(err) || attempt === 1) break;
            await sleep(1500 * (attempt + 1));
          }
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error("Falha em todos os providers de IA");
    },
  };
}
