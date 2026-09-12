import { DEFAULT_CONTEXT_BUDGET } from "@/lib/context-engine/config";
import { estimateContextTokens } from "@/lib/context-engine/file-selector";
import type { ContextPackage, ContextSelectionInput } from "@/lib/context-engine/types";

export function assembleContextPackage(input: ContextSelectionInput & { selectedFiles?: Array<{ path: string; type: string; reason: string; score?: number; sizeBytes?: number; imports?: string[]; dependencyDepth?: number; selectionMode?: "ranked" | "dependency-expanded" | "fallback" }> }): ContextPackage {
  const selectedFiles = (input.selectedFiles ?? []).map((file) => ({
    path: file.path,
    type: file.type as "page" | "component" | "service" | "api" | "schema" | "types" | "hook" | "util" | "config" | "unknown",
    score: file.score ?? 0,
    reason: file.reason ?? "selecionado",
    sizeBytes: file.sizeBytes ?? 0,
    imports: file.imports ?? [],
    dependencyDepth: file.dependencyDepth ?? 0,
    selectionMode: file.selectionMode ?? "ranked",
  }));

  const selectedBytes = selectedFiles.reduce((sum, file) => sum + (file.sizeBytes ?? 0), 0);
  const packageText = JSON.stringify({
    request: input.request,
    selectedFiles,
    blueprint: input.blueprint ?? null,
    businessDna: input.businessDna ?? null,
    experienceDna: input.experienceDna ?? null,
  });

  const metrics = {
    selectedBytes,
    estimatedTokens: estimateContextTokens(packageText),
    cacheHit: false,
    fallbackUsed: false,
    buildMs: 0,
  };

  const selectionMode = selectedFiles.length === 0 ? "fallback" : (selectedFiles.some((file) => (file.dependencyDepth ?? 0) > 1) ? "dependency-expanded" : "ranked");

  return {
    requestSummary: input.request.slice(0, 180),
    strategic: {
      businessDna: input.businessDna,
      experienceDna: input.experienceDna,
      blueprint: input.blueprint,
      goal: input.request,
    },
    structural: {
      repoMapSummary: "Mapa de projeto compactado para seleção local e contextual",
      selectedFilesCount: selectedFiles.length,
      totalFiles: input.repoMap?.totalFiles ?? selectedFiles.length,
      dependencyDepth: Math.max(0, ...selectedFiles.map((file) => file.dependencyDepth ?? 0)),
      exclusions: input.repoMap?.exclusions ?? [],
    },
    selectedFiles: selectedFiles.map((file) => ({
      ...file,
      selectionMode,
    })),
    problems: (input.repairIssues ?? []).map((issue) => ({
      file: issue.file,
      message: issue.message,
      severity: issue.severity ?? "error",
    })),
    instructions: [
      "Use apenas arquivos() diretamente relacionados ao pedido do usuário.",
      "Preserve a estrutura existente e o fluxo de preview.",
      "Caso a seleção falhe, retorne ao mecanismo legado.",
    ],
    budget: {
      maxFiles: input.maxFiles ?? DEFAULT_CONTEXT_BUDGET.maxFiles,
      maxBytes: input.maxBytes ?? DEFAULT_CONTEXT_BUDGET.maxBytes,
      maxEstimatedTokens: input.maxEstimatedTokens ?? DEFAULT_CONTEXT_BUDGET.maxEstimatedTokens,
      maxDependencyDepth: input.maxDependencyDepth ?? DEFAULT_CONTEXT_BUDGET.maxDependencyDepth,
    },
    metrics,
    source: "context-engine",
    contextVersion: "context-engine.v1",
    selectionMode,
  };
}
