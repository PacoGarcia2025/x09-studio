import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/store/user-store";

export type ApiChatMessage = {
  role: "user" | "ai" | "assistant" | "system";
  content: string;
};

export type GenerationPreference = "auto" | "premium";
export type ResolvedMode = "edit" | "fast" | "premium" | "repair" | "plan";
export type AgentPhase =
  | "planejando"
  | "construindo"
  | "verificando"
  | "corrigindo"
  | "concluido"
  | "erro";

export type RepairIssue = {
  id: string;
  category:
    | "compile"
    | "runtime"
    | "import"
    | "typescript"
    | "lint"
    | "build"
    | "other";
  severity?: "error" | "warning";
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
};

export type GenerationEvent =
  | { type: "phase"; phase: AgentPhase; label: string }
  | { type: "mode"; mode: ResolvedMode; model: string }
  | { type: "spec"; spec: unknown }
  | { type: "manifest"; manifest: unknown }
  | { type: "delta"; text: string }
  | {
      type: "metrics";
      inputTokens?: number;
      outputTokens?: number;
      latencyMs?: number;
      repairCycles?: number;
    }
  | { type: "error"; message: string }
  | { type: "done"; text: string; mode: ResolvedMode };

export type RouteContext = {
  preference: GenerationPreference;
  hasExistingApp: boolean;
  currentAppCode?: string;
  currentFiles?: Record<string, string>;
  phase?: "auto" | "plan" | "build" | "repair";
  repairIssues?: RepairIssue[];
  appSpec?: unknown;
  signal?: AbortSignal;
  onEvent?: (event: GenerationEvent) => void;
};

export const MODE_LABELS: Record<ResolvedMode, string> = {
  edit: "Groq · edição rápida",
  fast: "Gemini · rápido",
  premium: "Claude · premium",
  repair: "Claude · correção",
  plan: "Gemini · planejamento",
};

export const PHASE_LABELS: Record<AgentPhase, string> = {
  planejando: "Planejando",
  construindo: "Construindo",
  verificando: "Verificando",
  corrigindo: "Corrigindo",
  concluido: "Concluído",
  erro: "Erro",
};

function buildUserContext(): string {
  const profile = useUserStore.getState();
  const hasProfile = Boolean(
    profile.name.trim() ||
      profile.email.trim() ||
      profile.whatsapp.trim() ||
      profile.instagram.trim() ||
      profile.logoUrl.trim(),
  );

  if (!hasProfile) return "";

  return `\n\n=== DADOS REAIS DO CLIENTE ===
- Nome/Empresa: ${profile.name || "Não informado"}
- Email: ${profile.email || "Não informado"}
- WhatsApp: ${profile.whatsapp || "Não informado"}
- Instagram: ${profile.instagram || "Não informado"}
- URL da Logo: ${profile.logoUrl || "Não informado"}`;
}

function apiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined;
  if (env && env.trim()) return env.replace(/\/$/, "");
  return "";
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Cliente do BFF /api/llm/stream — chaves LLM ficam só no servidor.
 */
export async function streamAIResponse(
  onChunk: (text: string) => void,
  onFinish: (text: string) => void,
  messages: ApiChatMessage[],
  route: RouteContext,
): Promise<ResolvedMode> {
  const token = await getAccessToken();
  if (!token) {
    const errorText =
      "Faça login para usar a geração com IA (sessão necessária no BFF).";
    onChunk(errorText);
    onFinish(errorText);
    route.onEvent?.({ type: "error", message: errorText });
    return "fast";
  }

  let resolvedMode: ResolvedMode = "premium";
  let accumulated = "";

  try {
    const response = await fetch(`${apiBase()}/api/llm/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: route.signal,
      body: JSON.stringify({
        messages,
        preference: route.preference,
        hasExistingApp: route.hasExistingApp,
        currentAppCode: route.currentAppCode,
        currentFiles: route.currentFiles,
        userContext: buildUserContext(),
        phase: route.phase ?? "auto",
        repairIssues: route.repairIssues,
        appSpec: route.appSpec,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      let message = `Erro na API (${response.status})`;
      try {
        const parsed = JSON.parse(body) as { error?: string };
        if (parsed.error) message = parsed.error;
      } catch {
        if (body) message = body.slice(0, 400);
      }
      onChunk(message);
      onFinish(message);
      route.onEvent?.({ type: "error", message });
      return resolvedMode;
    }

    if (!response.body) {
      const message = "A API não retornou stream.";
      onChunk(message);
      onFinish(message);
      return resolvedMode;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;

        try {
          const event = JSON.parse(data) as GenerationEvent;
          route.onEvent?.(event);

          if (event.type === "delta") {
            accumulated = event.text;
            onChunk(accumulated);
          } else if (event.type === "mode") {
            resolvedMode = event.mode;
          } else if (event.type === "done") {
            accumulated = event.text;
            resolvedMode = event.mode;
            onChunk(accumulated);
          } else if (event.type === "error") {
            if (!accumulated) {
              accumulated = event.message;
              onChunk(accumulated);
            }
          }
        } catch {
          // ignore
        }
      }
    }

    onFinish(accumulated);
    return resolvedMode;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      const message = "Geração cancelada.";
      onChunk(accumulated || message);
      onFinish(accumulated || message);
      return resolvedMode;
    }
    const message =
      error instanceof Error
        ? `Falha ao conectar no BFF: ${error.message}`
        : "Falha ao conectar no BFF.";
    onChunk(accumulated || message);
    onFinish(accumulated || message);
    route.onEvent?.({ type: "error", message });
    return resolvedMode;
  }
}

/** Mantido no client só para preview de UI antes do stream. */
export function resolveGenerationMode(
  prompt: string,
  ctx: Pick<RouteContext, "preference" | "hasExistingApp">,
): ResolvedMode {
  if (ctx.preference === "premium") return "premium";
  const text = prompt.trim();
  const short = text.length < 220;
  const editHints =
    /\b(troca|muda|altera|ajusta|corrige|adiciona|remove|whatsapp|cor|texto|título)\b/i;
  const createHints = /\b(cria|gerar|landing|site|app|dashboard|crm|saas)\b/i;
  if (
    ctx.hasExistingApp &&
    short &&
    editHints.test(text) &&
    !createHints.test(text)
  ) {
    return "edit";
  }
  if (!ctx.hasExistingApp || createHints.test(text)) return "premium";
  return "fast";
}
