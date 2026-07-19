import type {
  LlmCompleteInput,
  LlmCompleteResult,
  LlmProvider,
} from "@/lib/llm/types";
import { createGeminiFlashProvider } from "@/lib/llm/gemini";
import { createGroqProvider } from "@/lib/llm/groq";
import { createOpenAIProvider } from "@/lib/llm/openai";
import {
  createClaudeViaOpenRouter,
  createGeminiViaOpenRouter,
  createOpenRouterProvider,
} from "@/lib/llm/openrouter";

/** Lê chave com aliases comuns (evita .env “certo” com nome errado). */
export function readEnvKey(...names: string[]): string | null {
  for (const name of names) {
    const raw = process.env[name];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }
  return null;
}

export function llmKeysStatus() {
  return {
    openrouter: Boolean(
      readEnvKey("OPENROUTER_API_KEY", "OPEN_ROUTER_API_KEY", "OPENROUTER_KEY"),
    ),
    groq: Boolean(readEnvKey("GROQ_API_KEY")),
    openai: Boolean(readEnvKey("OPENAI_API_KEY")),
    anthropic: Boolean(readEnvKey("ANTHROPIC_API_KEY")),
    gemini: Boolean(readEnvKey("GEMINI_API_KEY", "GOOGLE_AI_API_KEY")),
  };
}

export function isLlmQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /\b429\b/.test(message) ||
    /Too Many Requests/i.test(message) ||
    /RESOURCE_EXHAUSTED/i.test(message) ||
    /exceeded your current quota/i.test(message) ||
    /rate[_ ]?limit/i.test(message) ||
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

export function formatLlmUserError(err: unknown): string {
  const keys = llmKeysStatus();
  const hasPaid =
    keys.openrouter || keys.groq || keys.openai || keys.anthropic;

  if (isLlmQuotaError(err)) {
    if (!hasPaid) {
      return "A cota gratuita do Gemini esgotou. No .env do VPS configure OPENROUTER_API_KEY (ou GROQ_API_KEY) e reinicie o PM2.";
    }
    return "A IA falhou por limite de taxa. O Studio deveria usar OpenRouter/Groq/OpenAI — confira se as chaves estão no .env e rode: pm2 restart x09-studio --update-env";
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

function withOpenRouterKey<T>(fn: (key: string) => T): T | null {
  const key = readEnvKey(
    "OPENROUTER_API_KEY",
    "OPEN_ROUTER_API_KEY",
    "OPENROUTER_KEY",
  );
  if (!key) return null;
  // Garante que createOpenRouterProvider veja a chave canônica
  if (!process.env.OPENROUTER_API_KEY) {
    process.env.OPENROUTER_API_KEY = key;
  }
  try {
    return fn(key);
  } catch {
    return null;
  }
}

/**
 * Ordem: NÃO-Google primeiro (Groq, OpenAI, OpenRouter Llama/Qwen/Claude),
 * Google (OpenRouter + direto) por último.
 */
export function listFastProviders(): LlmProvider[] {
  const list: LlmProvider[] = [];
  const skipGoogle =
    process.env.STUDIO_LLM_SKIP_GEMINI === "1" ||
    process.env.STUDIO_LLM_PREFER === "openrouter";

  // 1) Groq
  if (readEnvKey("GROQ_API_KEY")) {
    try {
      pushUnique(list, createGroqProvider());
    } catch {
      // ignore
    }
  }

  // 2) OpenAI direto
  if (readEnvKey("OPENAI_API_KEY")) {
    try {
      pushUnique(list, createOpenAIProvider("gpt-4.1-mini"));
    } catch {
      // ignore
    }
  }

  // 3) OpenRouter — modelos SEM Google primeiro (usa seu crédito OpenRouter)
  withOpenRouterKey(() => {
    for (const model of [
      "openai/gpt-4.1-mini",
      "anthropic/claude-sonnet-4.5",
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen-2.5-72b-instruct",
    ]) {
      try {
        pushUnique(list, createOpenRouterProvider(model));
      } catch {
        // ignore
      }
    }
    try {
      pushUnique(list, createClaudeViaOpenRouter());
    } catch {
      // ignore
    }
  });

  if (skipGoogle) {
    return list;
  }

  // 4) OpenRouter Gemini (crédito OpenRouter, não cota free Google)
  withOpenRouterKey(() => {
    try {
      pushUnique(list, createGeminiViaOpenRouter());
    } catch {
      // ignore
    }
    try {
      pushUnique(list, createOpenRouterProvider("google/gemini-2.0-flash-001"));
    } catch {
      // ignore
    }
  });

  // 5) Gemini API direta — ÚLTIMO (cota free estoura fácil)
  if (readEnvKey("GEMINI_API_KEY", "GOOGLE_AI_API_KEY")) {
    for (const model of ["gemini-2.0-flash", "gemini-2.5-flash"]) {
      try {
        pushUnique(list, createGeminiFlashProvider(model));
      } catch {
        // ignore
      }
    }
  }

  return list;
}

export function createResilientFastProvider(): LlmProvider {
  const providers = listFastProviders();
  if (providers.length === 0) {
    throw new Error(
      "Nenhum provider de IA configurado (OPENROUTER_API_KEY / GROQ_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY).",
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
            const result = await provider.complete(input);
            return {
              ...result,
              // Mantém o modelo real usado (aparece no chat)
              model: result.model || provider.id,
            };
          } catch (err) {
            lastError = err;
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${provider.id}: ${msg.slice(0, 100)}`);
            console.warn(`[llm] falha ${provider.id}:`, msg.slice(0, 200));
            if (isLlmQuotaError(err)) break;
            if (!isLlmTransientError(err) || attempt === 1) break;
            await sleep(1200 * (attempt + 1));
          }
        }
      }

      console.error("[llm] todos os providers falharam:", errors.join(" | "));

      throw lastError instanceof Error
        ? lastError
        : new Error(`Falha em todos os providers (${errors.join(" | ")})`);
    },
  };
}
