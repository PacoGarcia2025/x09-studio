import type { CostGuardResult, ModelRouteDecision, ModelTier } from "@/lib/model-router/types";

export const MODEL_PRICE_TABLE: Record<string, { input: number | null; output: number | null; tier: ModelTier }> = {
  "gemini-2.5-flash": { input: null, output: null, tier: "ECONOMIC" },
  "llama-3.3-70b-versatile": { input: null, output: null, tier: "ECONOMIC" },
  "gpt-4.1-mini": { input: null, output: null, tier: "BALANCED" },
  "claude-sonnet-4.5": { input: null, output: null, tier: "PREMIUM" },
  "gemini-2.5-pro": { input: null, output: null, tier: "PREMIUM" },
};

export function estimateTokensForRoute(route: Pick<ModelRouteDecision, "estimatedTokens" | "tier">): number {
  return Math.max(1, route.estimatedTokens);
}

export function estimateModelCost(route: Pick<ModelRouteDecision, "model" | "estimatedTokens">): number | null {
  const price = MODEL_PRICE_TABLE[route.model];
  if (!price) return null;
  if (price.input == null || price.output == null) return null;
  return ((route.estimatedTokens / 1000) * price.input) + ((route.estimatedTokens / 1000) * price.output) * 0.25;
}

export function evaluateCostGuard(
  route: ModelRouteDecision,
  budget: { maxTokens?: number; maxEstimatedCost?: number } = {},
): CostGuardResult {
  const maxTokens = budget.maxTokens ?? route.estimatedTokens + 5000;
  const maxCost = budget.maxEstimatedCost ?? Number.POSITIVE_INFINITY;

  if (route.estimatedTokens > maxTokens) {
    if (route.tier === "PREMIUM") {
      return {
        status: "downgraded",
        reason: "orçamento excedido; downgrade para tier equilibrado",
        appliedModel: "BALANCED",
        downgradedTo: "BALANCED",
        estimatedTokens: route.estimatedTokens,
        estimatedCost: route.estimatedCost,
      };
    }
    return {
      status: "blocked",
      reason: "orçamento excedido e não há downgrade válido",
      appliedModel: route.tier,
      estimatedTokens: route.estimatedTokens,
      estimatedCost: route.estimatedCost,
    };
  }

  if (route.estimatedCost != null && route.estimatedCost > maxCost) {
    return {
      status: "downgraded",
      reason: "estimativa de custo acima do limite",
      appliedModel: route.tier,
      downgradedTo: route.tier === "PREMIUM" ? "BALANCED" : "ECONOMIC",
      estimatedTokens: route.estimatedTokens,
      estimatedCost: route.estimatedCost,
    };
  }

  return {
    status: "allowed",
    reason: "orçamento dentro do limite",
    appliedModel: route.tier,
    estimatedTokens: route.estimatedTokens,
    estimatedCost: route.estimatedCost,
  };
}
