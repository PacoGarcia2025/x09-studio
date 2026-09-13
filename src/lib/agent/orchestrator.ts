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
  buildEditQa,
} from "./prompts";
import {
  buildAgentPlanSkillAddon,
  buildAgentBuildSkillAddon,
  buildAgentEditSkillAddon,
  buildAgentRepairSkillAddon,
} from "@/lib/skills/agent-bridge";
import {
  formatCreativePatternsForPrompt,
  selectCreativePatterns,
} from "@/lib/creative-patterns";
import {
  formatBlueprintForPrompt,
  logBlueprintDecision,
  resolveBlueprint,
} from "@/lib/dna";
import {
  buildContextEnginePackage,
  unsafeLegacyContextFallback,
} from "@/lib/context-engine";
import { buildGenerationFlowContext } from "@/lib/agent/flow-context";
import { evaluateDiscoveryNeeds } from "@/lib/discovery-engine";
import { evaluateUnifiedQualityGate } from "@/lib/pipeline/quality-critic.server";

export type StreamEmit = (event: GenerationEvent) => void;

function mapRole(
  role: StreamRequest["messages"][number]["role"],
): LlmMessage["role"] {
  if (role === "ai" || role === "assistant") return "assistant";
  if (role === "system") return "system";
  return "user";
}

function mapBlueprintToAppSpecType(
  blueprintType: "website" | "application" | "saas" | "portal" | "game" | "generic",
): AppSpec["productType"] {
  switch (blueprintType) {
    case "saas":
      return "saas";
    case "application":
      return "dashboard";
    case "portal":
      return "marketplace";
    case "game":
      return "other";
    case "website":
      return "landing";
    default:
      return "other";
  }
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSON não encontrado");
  return JSON.parse(raw.slice(start, end + 1));
}

async function renderContextSnapshot(req: StreamRequest, prompt: string) {
  const currentFiles = req.currentFiles && Object.keys(req.currentFiles).length > 0 ? req.currentFiles : undefined;

  try {
    const contextPackage = await buildContextEnginePackage({
      request: prompt,
      businessDna: undefined,
      experienceDna: undefined,
      blueprint: undefined,
      repoMap: currentFiles
        ? {
            projectId: null,
            generatedAt: new Date().toISOString(),
            totalFiles: Object.keys(currentFiles).length,
            files: Object.entries(currentFiles).map(([path, content]) => ({
              path,
              type: path.includes("page") ? "page" : path.includes("component") ? "component" : path.includes("api") ? "api" : "unknown",
              imports: [],
              sizeBytes: Buffer.byteLength(content, "utf8"),
              depth: path.split("/").length,
              reason: "currentFiles",
              contentHints: ["current", "file"],
            })),
            exclusions: ["node_modules", ".next"],
            stats: {
              pages: 0,
              components: 0,
              services: 0,
              apis: 0,
              schemas: 0,
              unknown: 0,
            },
          }
        : undefined,
      currentFiles,
      repairIssues: req.repairIssues,
      projectId: undefined,
      useCache: true,
      maxFiles: 12,
      maxBytes: 180_000,
      maxEstimatedTokens: 12_000,
      maxDependencyDepth: 3,
    });

    return { contextPackage, fallbackUsed: false };
  } catch {
    const contextPackage = await unsafeLegacyContextFallback({
      request: prompt,
      currentFiles,
      repairIssues: req.repairIssues,
      maxFiles: 12,
      maxBytes: 180_000,
      maxEstimatedTokens: 12_000,
      maxDependencyDepth: 3,
    });
    return { contextPackage, fallbackUsed: true };
  }
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

  const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
  const planPrompt = lastUser?.content ?? "";
  const provider = getProviderForMode("plan", {
    request: planPrompt,
    taskType: "planning",
    complexity: "medium",
    contextMetrics: {
      selectedFiles: 0,
      estimatedTokens: 6000,
    },
    projectState: { hasExistingApp: req.hasExistingApp },
  });
  emit({ type: "mode", mode: "plan", model: provider.id });
  const blueprint = resolveBlueprint(planPrompt, {
    hasExistingApp: req.hasExistingApp,
  });
  logBlueprintDecision(blueprint);
  const flowContext = buildGenerationFlowContext({
    prompt: planPrompt,
    hasExistingApp: req.hasExistingApp,
    projectContext: {
      goal: planPrompt,
      segment: blueprint.industry,
      requiresBrandAssets: /landing|imobili|premium|marca|hero/.test(planPrompt.toLowerCase()),
    },
  });
  const { contextPackage, fallbackUsed } = await renderContextSnapshot(req, planPrompt);
  const contextSummary = JSON.stringify(
    {
      strategic: {
        businessDna: contextPackage.strategic.businessDna,
        experienceDna: contextPackage.strategic.experienceDna,
        blueprint: contextPackage.strategic.blueprint ?? blueprint,
        goal: planPrompt,
      },
      structural: {
        selectedFilesCount: contextPackage.selectedFiles.length,
        totalFiles: contextPackage.structural.totalFiles,
      },
      selectedFiles: contextPackage.selectedFiles.slice(0, 12),
      fallbackUsed,
    },
    null,
    2,
  );
  const selectedPatterns = selectCreativePatterns({
    businessDna: contextPackage.strategic.businessDna ?? undefined,
    experienceDna: contextPackage.strategic.experienceDna ?? undefined,
    blueprint: contextPackage.strategic.blueprint ?? blueprint,
    taskContext: planPrompt,
    maxPatterns: 3,
  });
  const creativePatternsSummary = formatCreativePatternsForPrompt(selectedPatterns);
  const messages: LlmMessage[] = [
    {
      role: "system",
      content: `${PLAN_SYSTEM_PROMPT}\n\n${buildAgentPlanSkillAddon(planPrompt)}\n\n=== X09 GENERATION CONTRACT (REQUISITOS ESTRUTURAIS INDISCUTÍVEIS) ===\n${JSON.stringify(flowContext.contract, null, 2)}\n\n=== X09 PROJECT BRIEF ===\n${JSON.stringify(flowContext.projectBrief, null, 2)}\n\n=== X09 BUSINESS DNA + EXPERIENCE DNA + BLUEPRINT ===\n${formatBlueprintForPrompt(blueprint)}\n\n=== X09 RESOURCE DECISION ===\n${JSON.stringify(flowContext.resourceDecision, null, 2)}\n\n=== X09 CREATIVE DIRECTION ===\n${JSON.stringify(flowContext.creativeDirection, null, 2)}\n\n=== X09 EXPERIENCE COMPOSITION ===\n${JSON.stringify(flowContext.experienceComposition, null, 2)}\n\n=== X09 CREATIVE PATTERNS ===\n${creativePatternsSummary}\n\n=== CONTEXT ENGINE ===\n${contextSummary}`,
    },
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

  // Contract Authority Enforcement: LLM cannot collapse an application/saas/portal/dashboard into landing
  if (
    flowContext.contract.blueprint.productType !== "website" &&
    flowContext.contract.blueprint.productType !== "generic"
  ) {
    parsed.productType = mapBlueprintToAppSpecType(flowContext.contract.blueprint.productType);
  }

  // Merge required pages from Blueprint into AppSpec if missing
  const pageIds = new Set(parsed.pages.map((p) => p.id));
  for (const reqPage of flowContext.contract.blueprint.requiredPages) {
    if (!pageIds.has(reqPage.id)) {
      parsed.pages.push({
        id: reqPage.id,
        title: reqPage.title,
        path: reqPage.route,
        purpose: reqPage.purpose,
        sections: ["header", reqPage.id, "cta", "footer"],
      });
      pageIds.add(reqPage.id);
    }
  }

  // Merge required entities from Blueprint into AppSpec if missing
  const entityNames = new Set(parsed.entities.map((e) => e.name.toLowerCase()));
  for (const reqEntity of flowContext.contract.blueprint.requiredEntities) {
    if (!entityNames.has(reqEntity.toLowerCase())) {
      parsed.entities.push({
        name: reqEntity,
        fields: [
          { name: "id", type: "string", required: true },
          { name: "name", type: "string", required: true },
          { name: "status", type: "string", required: true },
        ],
        operations: ["list", "create", "update", "delete", "read"],
      });
      entityNames.add(reqEntity.toLowerCase());
    }
  }

  if (flowContext.contract.blueprint.authRequired) {
    parsed.authRequired = true;
  }

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

  const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
  const buildPrompt = lastUser?.content ?? "";

  const provider = getProviderForMode(
    mode === "edit" ? "edit" : mode === "repair" ? "repair" : "premium",
    {
      request: buildPrompt,
      taskType:
        mode === "edit"
          ? "edit"
          : mode === "repair"
            ? "repair"
            : "generation",
      complexity:
        mode === "repair"
          ? "critical"
          : mode === "edit"
            ? "simple"
            : "medium",
      contextMetrics: {
        selectedFiles: 0,
        estimatedTokens: 8000,
      },
      repairIssues: req.repairIssues,
      repairCycles: req.repairIssues?.length ?? 0,
      projectState: { hasExistingApp: req.hasExistingApp },
    },
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

  const skillAddon =
    mode === "edit"
      ? buildAgentEditSkillAddon(buildPrompt)
      : mode === "repair"
        ? buildAgentRepairSkillAddon()
        : buildAgentBuildSkillAddon(buildPrompt);

  const { contextPackage, fallbackUsed } = await renderContextSnapshot(req, buildPrompt);
  const contextSummary = JSON.stringify(
    {
      strategic: {
        businessDna: contextPackage.strategic.businessDna,
        experienceDna: contextPackage.strategic.experienceDna,
        blueprint: contextPackage.strategic.blueprint,
      },
      selectedFiles: contextPackage.selectedFiles.slice(0, 12),
      fallbackUsed,
    },
    null,
    2,
  );
  const selectedPatterns = selectCreativePatterns({
    businessDna: contextPackage.strategic.businessDna ?? undefined,
    experienceDna: contextPackage.strategic.experienceDna ?? undefined,
    blueprint: contextPackage.strategic.blueprint ?? undefined,
    taskContext: buildPrompt,
    maxPatterns: 3,
  });
  const creativePatternsSummary = formatCreativePatternsForPrompt(selectedPatterns);
  const flowContext = buildGenerationFlowContext({
    prompt: buildPrompt,
    hasExistingApp: req.hasExistingApp,
    projectContext: {
      goal: buildPrompt,
      segment: contextPackage.strategic.blueprint?.industry ?? undefined,
      requiresBrandAssets: /landing|imobili|premium|marca|hero/.test(buildPrompt.toLowerCase()),
    },
  });
  const system = `${systemBase}\n\n${skillAddon}\n${req.userContext ?? ""}\n\n=== X09 GENERATION CONTRACT (CONTRATO ESTRUTURAL OBRIGATÓRIO) ===\n${JSON.stringify(flowContext.contract, null, 2)}\n\n=== X09 PROJECT BRIEF ===\n${JSON.stringify(flowContext.projectBrief, null, 2)}\n\n=== X09 BUSINESS DNA + EXPERIENCE DNA + BLUEPRINT ===\n${JSON.stringify({ businessDna: contextPackage.strategic.businessDna, experienceDna: contextPackage.strategic.experienceDna, blueprint: contextPackage.strategic.blueprint ?? flowContext.blueprint }, null, 2)}\n\n=== X09 RESOURCE DECISION ===\n${JSON.stringify(flowContext.resourceDecision, null, 2)}\n\n=== X09 CREATIVE DIRECTION ===\n${JSON.stringify(flowContext.creativeDirection, null, 2)}\n\n=== X09 EXPERIENCE COMPOSITION ===\n${JSON.stringify(flowContext.experienceComposition, null, 2)}\n\n=== X09 CREATIVE PATTERNS ===\n${creativePatternsSummary}\n\n=== CONTEXT ENGINE ===\n${contextSummary}`;

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
      extra += `\n\n=== App.tsx ATUAL (APLIQUE A MUDANÇA NESTE ARQUIVO E DEVOLVA COMPLETO) ===\n\`\`\`tsx\n${req.currentAppCode}\n\`\`\`\n`;
    }

    if (req.currentFiles && Object.keys(req.currentFiles).length > 0) {
      const entries = Object.entries(req.currentFiles)
        .filter(
          ([p]) =>
            p !== "/package.json" &&
            !p.startsWith("/components/ui/") &&
            p !== "/design-tokens.ts" &&
            p !== "/lib/mock-data.ts",
        )
        .slice(0, 12);
      if (entries.length && mode !== "edit") {
        extra += "\n\n=== ARQUIVOS ATUAIS ===\n";
        for (const [path, code] of entries) {
          extra += `\n--- ${path} ---\n\`\`\`tsx\n${code.slice(0, 12_000)}\n\`\`\`\n`;
        }
      }
    }

    if (mode === "repair" && req.repairIssues?.length) {
      extra += `\n\n=== ERROS A CORRIGIR ===\n${JSON.stringify(req.repairIssues, null, 2)}\n`;
    }

    if (mode === "edit") {
      extra += buildEditQa();
    } else if (mode !== "repair") {
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

/** Orquestra plan-only, plan → build, edit ou repair. */
export async function runAgentStream(
  req: StreamRequest,
  emit: StreamEmit,
  signal?: AbortSignal,
): Promise<void> {
  const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
  const prompt = lastUser?.content ?? "";
  // Junta todas as respostas do usuário: evaluateDiscoveryNeeds só olha a ÚLTIMA mensagem,
  // e uma resposta pontual ("não tenho logo") não repete os dados já dados antes — sem isso
  // o Discovery reperguntava tudo de novo a cada turno (loop infinito de perguntas).
  const discoveryQuery = req.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  const mode =
    req.phase === "repair"
      ? ("repair" as const)
      : resolveGenerationMode(prompt, {
          preference: req.preference,
          hasExistingApp: req.hasExistingApp,
        });

  const discovery = evaluateDiscoveryNeeds({ query: discoveryQuery });
  if (
    !discovery.isSufficient &&
    !req.hasExistingApp &&
    mode !== "edit" &&
    mode !== "repair" &&
    req.phase !== "repair"
  ) {
    emit({
      type: "phase",
      phase: "planejando",
      label: "Discovery Engine — solicitando informações essenciais…",
    });
    // Uma pergunta por vez (não a lista inteira) — mais natural e evita sobrecarregar o usuário.
    const nextQuestion = discovery.questions[0];
    const questionText = nextQuestion
      ? `Antes de gerar, preciso de mais uma informação: ${nextQuestion}`
      : "Para criar o aplicativo exato para sua marca, me conte mais detalhes essenciais.";
    emit({ type: "delta", text: questionText });
    emit({ type: "done", text: questionText, mode: "plan" });
    return;
  }

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

    // Plan é uma entrega não-billable e não pode cair silenciosamente em Build.
    // No modo auto, o plano continua sendo usado como entrada da geração.
    if (req.phase === "plan") {
      if (!spec) {
        throw new Error("Não foi possível gerar o plano do aplicativo.");
      }
      const text = JSON.stringify(spec, null, 2);
      emit({
        type: "phase",
        phase: "concluido",
        label: "Plano concluído",
      });
      emit({ type: "done", text, mode: "plan" });
      return;
    }

    const text = await streamBuild(req, mode, emit, spec, signal);

    const gate = evaluateUnifiedQualityGate({
      repairIssues: req.repairIssues ?? [],
      repairCycles: req.repairIssues?.length ?? 0,
      maxRepairCycles: 3,
      qualityReport: {
        ok: true,
        score: 100,
        issues: [],
      },
    });

    if (gate.status === "IMPROVE") {
      emit({
        type: "phase",
        phase: "corrigindo",
        label: gate.summary,
      });
      emit({
        type: "error",
        message: JSON.stringify({ status: gate.status, issues: gate.issues }),
      });
      return;
    }

    if (gate.status === "FAIL") {
      emit({
        type: "phase",
        phase: "erro",
        label: gate.summary,
      });
      emit({
        type: "error",
        message: gate.summary,
      });
      return;
    }

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
