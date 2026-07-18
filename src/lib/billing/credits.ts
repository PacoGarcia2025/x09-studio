import type { ResolvedMode } from "@/lib/agent/schemas";

export const CREDIT_COSTS = {
  generation: 1,
  edit: 1,
} as const;

export type BillableMode = "edit" | "generation" | "skip";

/**
 * Maps agent mode/phase to billing category.
 * A code-producing Build costs one credit.
 * Plan-only and repair phases do not consume credits.
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
  if (billable === "edit") return CREDIT_COSTS.edit;
  return CREDIT_COSTS.generation;
}
