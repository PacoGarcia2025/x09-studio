import type { GenerationMetrics } from "@/store/studio-store";

export type AcceptanceGate = {
  id: string;
  label: string;
  passed: boolean;
};

/**
 * Gates de aceite observáveis por geração.
 */
export function evaluateAcceptanceGates(input: {
  hasPreviewError: boolean;
  repairCycles: number;
  fileCount: number;
  usesDesignTokens: boolean;
  usesKit: boolean;
  metrics: GenerationMetrics | null;
}): AcceptanceGate[] {
  return [
    {
      id: "preview-clean",
      label: "Preview sem erro de runtime/compile",
      passed: !input.hasPreviewError,
    },
    {
      id: "repair-budget",
      label: "Repair ≤ 3 ciclos",
      passed: input.repairCycles <= 3,
    },
    {
      id: "multifile",
      label: "Projeto multi-arquivo",
      passed: input.fileCount >= 2,
    },
    {
      id: "design-tokens",
      label: "Usa DESIGN_TOKENS",
      passed: input.usesDesignTokens,
    },
    {
      id: "kit",
      label: "Usa kit X09 (components/ui)",
      passed: input.usesKit,
    },
    {
      id: "first-build",
      label: "Primeiro build ok (ou corrigido)",
      passed: input.metrics?.firstBuildOk !== false,
    },
  ];
}

export function summarizeGates(gates: AcceptanceGate[]): {
  score: number;
  passed: boolean;
} {
  const ok = gates.filter((g) => g.passed).length;
  return {
    score: gates.length ? ok / gates.length : 0,
    passed: gates.every((g) => g.passed),
  };
}
