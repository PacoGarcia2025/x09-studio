import type { ResolvedMode } from "@/lib/agent/schemas";

/**
 * Preço ao usuário, no piso Studio (~R$ 0,88 líquidos / crédito após MP).
 * Ask/edit/generation cobram a mensagem do usuário; repair interno não.
 */
export const CREDIT_COSTS = {
  ask: 1,
  edit: 2,
  generation: 3,
} as const;

export type BillableMode = "ask" | "edit" | "generation" | "skip";

export const STUDIO_ACTION_PRICES = [
  {
    id: "ask",
    label: "Pergunta no chat (não altera código)",
    credits: CREDIT_COSTS.ask,
  },
  {
    id: "edit",
    label: "Mensagem no chat que altera o site ou app",
    credits: CREDIT_COSTS.edit,
  },
  {
    id: "generation",
    label: "Criar ou gerar site / app",
    credits: CREDIT_COSTS.generation,
  },
  {
    id: "repair",
    label: "Correção automática de erro do próprio Studio",
    credits: 0,
  },
  {
    id: "visual",
    label: "GLB ou foto da galeria no layout (sem IA)",
    credits: 0,
  },
] as const;

/**
 * Maps agent mode/phase to billing category.
 * A user-facing code Build costs generation credits.
 * Plan-only and repair phases do not consume extra credits
 * (já pagos na mensagem que disparou o build).
 */
export function resolveBillableMode(input: {
  mode: ResolvedMode;
  phase?: "auto" | "plan" | "build" | "repair";
}): BillableMode {
  if (
    input.phase === "repair" ||
    input.mode === "repair" ||
    input.phase === "plan" ||
    input.mode === "plan"
  ) {
    return "skip";
  }
  if (input.mode === "edit") return "edit";
  return "generation";
}

export function creditCostFor(billable: BillableMode): number {
  if (billable === "skip") return 0;
  return CREDIT_COSTS[billable];
}

export function ledgerReasonForMode(
  mode: "ask" | "edit" | "generation",
): "edit_debit" | "generation_debit" {
  return mode === "generation" ? "generation_debit" : "edit_debit";
}
