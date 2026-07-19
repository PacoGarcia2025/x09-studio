import type {
  LlmCompleteInput,
  LlmCompleteResult,
  LlmProvider,
} from "@/lib/llm/types";
import { createGeminiFlashProvider } from "@/lib/llm/gemini";
import { createGroqProvider } from "@/lib/llm/groq";
import {
  createGeminiViaOpenRouter,
  createOpenRouterProvider,
} from "@/lib/llm/openrouter";

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

function hasAlternateLlmKeys(): boolean {
  return Boolean(
    process.env.OPENROUTER_API_KEY?.trim() || process.env.GROQ_API_KEY?.trim(),
  );
}

/** Mensagem amigável para o chat (sem stack do Google). */
export function formatLlmUserError(err: unknown): string {
  if (isLlmQuotaError(err)) {
    if (!hasAlternateLlmKeys()) {
      return "A cota gratuita do Gemini esgotou. Configure OPENROUTER_API_KEY ou GROQ_API_KEY no .env do VPS para continuar, ou aguarde o reset da cota.";
    }
    return "Todos os provedores de IA atingiram o limite agora. Aguarde 1–2 minutos e tente de novo.";
  }

  const message = err instanceof Error ? err.message : String(err);

  if (/\b503\b|Service Unavailable|high demand/i.test(message)) {
    return "A IA está temporariamente sobrecarregada. Tente de novo em instantes.";
  }

  if (/Missing .+API_KEY/i.test(message)) {
    return "A chave da IA não está configurada no servidor. Avise o administrador.";
  }

  const short = message.replace(/\s+/g, " ").trim().slice(0, 180);
  return short || "Falha ao falar com a IA.";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pushUnique(list: LlmProvider[], provider: LlmProvider) {
  if (list.some((p) => p.id === provider.id)) return;
  list.push(provider);
}

/**
 * Ordem: Groq → OpenRouter (Gemini + free) → Gemini direto (modelos alternativos).
 * Evita depender só da cota gratuita do Google.
 */
export function listFastProviders(): LlmProvider[] {
  const list: LlmProvider[] = [];

  // 1) Groq — cota separada, bom para plano/build
  if (process.env.GROQ_API_KEY?.trim()) {
    try {
      pushUnique(list, createGroqProvider());
    } catch {
      // ignore
    }
  }

  // 2) OpenRouter — Gemini + modelos free (não Google direto)
  if (process.env.OPENROUTER_API_KEY?.trim()) {
    try {
      pushUnique(list, createGeminiViaOpenRouter());
    } catch {
      // ignore
    }
    for (const model of [
      "google/gemini-2.0-flash-001",
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen-2.5-72b-instruct",
    ]) {
      try {
        pushUnique(list, createOpenRouterProvider(model));
      } catch {
        // ignore
      }
    }
  }

  // 3) Gemini direto por último (e com modelos alternativos)
  if (process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim()) {
    for (const model of [
      "gemini-2.0-flash",
      "gemini-2.5-flash",
      "gemini-1.5-flash",
    ]) {
      try {
        pushUnique(list, createGeminiFlashProvider(model));
      } catch {
        // ignore
      }
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
    throw new Error(
      "Nenhum provider de IA configurado (GEMINI_API_KEY / OPENROUTER_API_KEY / GROQ_API_KEY).",
    );
  }

  return {
    id: `resilient:${providers.map((p) => p.id).join("|")}`,
    async complete(input: LlmCompleteInput): Promise<LlmCompleteResult> {
      let lastError: unknown;
      const errors: string[] = [];

      for (const provider of providers) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            return await provider.complete(input);
          } catch (err) {
            lastError = err;
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${provider.id}: ${msg.slice(0, 80)}`);
            if (isLlmQuotaError(err)) break;
            if (!isLlmTransientError(err) || attempt === 1) break;
            await sleep(1200 * (attempt + 1));
          }
        }
      }

      if (isLlmQuotaError(lastError)) {
        throw lastError instanceof Error
          ? lastError
          : new Error("Cota de IA esgotada");
      }

      throw lastError instanceof Error
        ? lastError
        : new Error(`Falha em todos os providers (${errors.join(" | ")})`);
    },
  };
}
