import "server-only";
import { getProviderForMode } from "@/lib/llm/provider";
import type { LlmMessage } from "@/lib/llm/types";
import {
  AppSpecSchema,
  type AppSpec,
  type FileManifest,
  FileManifestSchema,
  type GenerationEvent,
  type RepairIssue,
  type ResolvedMode,
  type StreamRequest,
} from "./schemas";
import { resolveGenerationMode } from "./router";
import {
  BUILD_SYSTEM_PROMPT,
  EDIT_SYSTEM_PROMPT,
  PLAN_SYSTEM_PROMPT,
  REPAIR_SYSTEM_PROMPT,
  buildArtQa,
} from "./prompts";

export type StreamEmit = (event: GenerationEvent) => void;

function mapRole(
  role: StreamRequest["messages"][number]["role"],
): LlmMessage["role"] {
  if (role === "ai" || role === "assistant") return "assistant";
  if (role === "system") return "system";
  return "user";
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSON não encontrado");
  return JSON.parse(raw.slice(start, end + 1));
}

async function runPlan(
  req: StreamRequest,
  emit: StreamEmit,
  signal?: AbortSignal,
): Promise<AppSpec> {
  emit({
    type: "phase",
    phase: "planejando",
    label: "Definindo produto, páginas e critérios…",
  });

  const provider = getProviderForMode("plan");
  emit({ type: "mode", mode: "plan", model: provider.id });

  const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
  const messages: LlmMessage[] = [
    { role: "system", content: PLAN_SYSTEM_PROMPT },
    {
      role: "user",
      content: `${lastUser?.content ?? ""}\n\n${req.userContext ?? ""}\n\nResponda SOMENTE com JSON válido (AppSpec).`,
    },
  ];

  const result = provider.stream
    ? await provider.stream({
        messages,
        temperature: 0.3,
        maxOutputTokens: 4096,
        signal,
        onDelta: (_d, acc) => emit({ type: "delta", text: acc }),
      })
    : await provider.complete({
        messages,
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseJsonSchema: { type: "object" },
      });

  if (!provider.stream) {
    emit({ type: "delta", text: result.text });
  }

  const parsed = AppSpecSchema.parse(extractJsonObject(result.text));
  emit({ type: "spec", spec: parsed });
  return parsed;
}

function buildManifestFromSpec(spec: AppSpec): FileManifest {
  const files: FileManifest["files"] = [
    {
      path: "/App.tsx",
      role: "entry",
      description: "Entrypoint com roteamento simples por estado",
    },
    {
      path: "/components/ui/index.tsx",
      role: "component",
      description: "Re-exports do kit X09 (já injetado) — não sobrescrever",
    },
    {
      path: "/lib/data.ts",
      role: "service",
      description: "Adapters mock de auth e CRUD",
    },
  ];

  for (const page of spec.pages) {
    files.push({
      path: `/pages/${page.id}.tsx`,
      role: "page",
      description: `${page.title}: ${page.purpose}`,
    });
  }

  for (const entity of spec.entities) {
    files.push({
      path: `/services/${entity.name.toLowerCase()}.ts`,
      role: "service",
      description: `CRUD mock para ${entity.name}`,
    });
  }

  if (spec.authRequired || spec.entities.length > 0) {
    files.push({
      path: "/supabase/migrations/001_init.sql",
      role: "migration",
      description: "Schema SQL + RLS (aplicado só no Publish)",
    });
  }

  return FileManifestSchema.parse({ files });
}

async function streamBuild(
  req: StreamRequest,
  mode: ResolvedMode,
  emit: StreamEmit,
  spec: AppSpec | undefined,
  signal?: AbortSignal,
): Promise<string> {
  emit({
    type: "phase",
    phase: "construindo",
    label: "Gerando interface e arquivos…",
  });

  const provider = getProviderForMode(
    mode === "edit" ? "edit" : mode === "repair" ? "repair" : "premium",
  );
  emit({ type: "mode", mode, model: provider.id });

  if (spec) {
    const manifest = buildManifestFromSpec(spec);
    emit({ type: "manifest", manifest });
  }

  const systemBase =
    mode === "edit"
      ? EDIT_SYSTEM_PROMPT
      : mode === "repair"
        ? REPAIR_SYSTEM_PROMPT
        : BUILD_SYSTEM_PROMPT;

  const system = `${systemBase}\n${req.userContext ?? ""}`;

  const formatted = req.messages
    .filter((m) => m.content.trim())
    .map((m) => ({ role: mapRole(m.role), content: m.content }));

  const lastIdx = formatted.length - 1;
  if (lastIdx >= 0 && formatted[lastIdx]!.role === "user") {
    let extra = "";

    if (spec) {
      extra += `\n\n=== APP SPEC (obrigatório seguir) ===\n${JSON.stringify(spec, null, 2)}\n`;
    }

    if (mode === "edit" && req.currentAppCode) {
      extra += `\n\n=== App.tsx ATUAL ===\n\`\`\`tsx\n${req.currentAppCode}\n\`\`\`\n`;
    }

    if (req.currentFiles && Object.keys(req.currentFiles).length > 0) {
      const entries = Object.entries(req.currentFiles)
        .filter(([p]) => p !== "/package.json")
        .slice(0, 12);
      extra += "\n\n=== ARQUIVOS ATUAIS ===\n";
      for (const [path, code] of entries) {
        extra += `\n--- ${path} ---\n\`\`\`tsx\n${code.slice(0, 12_000)}\n\`\`\`\n`;
      }
    }

    if (mode === "repair" && req.repairIssues?.length) {
      extra += `\n\n=== ERROS A CORRIGIR ===\n${JSON.stringify(req.repairIssues, null, 2)}\n`;
    }

    if (mode !== "edit" && mode !== "repair") {
      extra += buildArtQa();
    }

    formatted[lastIdx]!.content += extra;
  }

  const messages: LlmMessage[] = [
    { role: "system", content: system },
    ...formatted,
  ];

  const started = Date.now();

  if (!provider.stream) {
    const result = await provider.complete({
      messages,
      temperature: mode === "edit" || mode === "repair" ? 0.35 : 0.75,
      maxOutputTokens: 16_384,
    });
    emit({ type: "delta", text: result.text });
    emit({
      type: "metrics",
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      latencyMs: Date.now() - started,
    });
    return result.text;
  }

  const result = await provider.stream({
    messages,
    temperature: mode === "edit" || mode === "repair" ? 0.35 : 0.75,
    maxOutputTokens: 16_384,
    signal,
    onDelta: (_d, acc) => emit({ type: "delta", text: acc }),
  });

  emit({
    type: "metrics",
    inputTokens: result.usage?.inputTokens,
    outputTokens: result.usage?.outputTokens,
    latencyMs: Date.now() - started,
  });

  return result.text;
}

/**
 * Orquestra plan → build (ou edit/repair direto).
 */
export async function runAgentStream(
  req: StreamRequest,
  emit: StreamEmit,
  signal?: AbortSignal,
): Promise<void> {
  const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
  const prompt = lastUser?.content ?? "";

  const mode =
    req.phase === "repair"
      ? ("repair" as const)
      : resolveGenerationMode(prompt, {
          preference: req.preference,
          hasExistingApp: req.hasExistingApp,
        });

  try {
    let spec = req.appSpec;
    const shouldPlan =
      req.phase === "plan" ||
      (req.phase === "auto" &&
        (mode === "premium" || mode === "fast") &&
        !req.hasExistingApp);

    if (shouldPlan && !spec) {
      try {
        spec = await runPlan(req, emit, signal);
      } catch (planError) {
        // Spec falhou — segue para build sem spec (não bloqueia)
        emit({
          type: "phase",
          phase: "construindo",
          label: "Plano parcial — gerando diretamente…",
        });
        console.warn("[agent] plan failed", planError);
      }
    }

    const text = await streamBuild(req, mode, emit, spec, signal);

    emit({
      type: "phase",
      phase: "concluido",
      label: "Geração concluída",
    });
    emit({ type: "done", text, mode });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      emit({ type: "error", message: "Geração cancelada." });
      return;
    }
    const message =
      error instanceof Error ? error.message : "Falha desconhecida no agente.";
    emit({ type: "phase", phase: "erro", label: message });
    emit({ type: "error", message: sanitizeProviderError(message) });
  }
}

function sanitizeProviderError(message: string): string {
  return message
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]")
    .replace(/gsk_[a-zA-Z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 500);
}

export type { RepairIssue };
