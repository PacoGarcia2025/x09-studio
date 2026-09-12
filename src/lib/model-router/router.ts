import { evaluateCostGuard } from "@/lib/model-router/cost";
import { inferTaskContext } from "@/lib/model-router/complexity";
import type {
  FallbackPolicy,
  ModelRouteDecision,
  ModelRouteInput,
  ModelTier,
  TaskType,
} from "@/lib/model-router/types";

const MAX_ESCALATIONS = 3;

function routeTierByTask(taskType: TaskType, complexity: string, repairCycles = 0): ModelTier {
  if (complexity === "critical" || taskType === "repair" || taskType === "architecture") {
    return "PREMIUM";
  }

  if (complexity === "complex") {
    return repairCycles > 1 ? "PREMIUM" : "BALANCED";
  }

  if (complexity === "medium") {
    return repairCycles > 0 ? "BALANCED" : "BALANCED";
  }

  if (complexity === "simple") return "ECONOMIC";
  if (complexity === "trivial") return "ECONOMIC";

  return "BALANCED";
}

function resolveModelForTier(tier: ModelTier): { provider: ModelRouteDecision["provider"]; model: string } {
  if (tier === "ECONOMIC") return { provider: "groq", model: "llama-3.3-70b-versatile" };
  if (tier === "BALANCED") return { provider: "openrouter", model: "gpt-4.1-mini" };
  return { provider: "claude", model: "claude-sonnet-4.5" };
}

function clampEscalation(repairCycles: number): number {
  if (!Number.isFinite(repairCycles)) return 0;
  return Math.min(Math.max(repairCycles, 0), MAX_ESCALATIONS);
}

export function routeModelForTask(input: ModelRouteInput): ModelRouteDecision {
  const classification = inferTaskContext(input);
  const selectedComplexity = classification.complexity;
  const selectedType = classification.taskType;
  const repairCycles = Math.max(0, input.repairCycles ?? input.projectState?.repairCycles ?? 0);
  const contextTokens = input.contextMetrics?.estimatedTokens ?? input.contextMetrics?.totalTokens ?? 4000;
  const estimatedTokens = Math.min(Math.max(contextTokens, 500), 30000);
  const tierBase = routeTierByTask(selectedType, selectedComplexity, repairCycles);

  const preference = input.userModelPreference ?? "balanced";
  const maxBudgetTokens = input.budget?.maxTokens ?? 0;
  let tier = tierBase;
  let reason = `classificação ${selectedType}/${selectedComplexity}; tier ${tierBase.toLowerCase()}`;

  if (preference === "premium" && tierBase !== "PREMIUM") {
    tier = "PREMIUM";
    reason = `preferência premium respeitada; ${reason}`;
  }
  if (preference === "cheap" && tierBase === "PREMIUM") {
    tier = "BALANCED";
    reason = `preferência econômica ajustada ao custo; ${reason}`;
  }

  if (maxBudgetTokens > 0 && estimatedTokens > maxBudgetTokens) {
    const downgraded = tier === "PREMIUM" ? "BALANCED" : "ECONOMIC";
    tier = downgraded;
    reason = `${reason}; orçamento excedido -> ${downgraded}`;
  }

  const { provider, model } = resolveModelForTier(tier);
  const modelDecision: ModelRouteDecision = {
    tier,
    provider,
    model,
    type: selectedType,
    complexity: selectedComplexity,
    reason,
    estimatedTokens,
    estimatedCost: null,
    fallbackPolicy: "allow",
    legacyMode: selectedType === "repair" ? "repair" : tier === "PREMIUM" ? "premium" : "fast",
    escalationLevel: clampEscalation(repairCycles),
    taskType: selectedType,
  };

  const guard = evaluateCostGuard(modelDecision, input.budget ?? {});
  if (guard.status === "downgraded") {
    const downgradedTier = guard.downgradedTo ?? "ECONOMIC";
    const fallback = resolveModelForTier(downgradedTier);
    return {
      ...modelDecision,
      tier: downgradedTier,
      provider: fallback.provider,
      model: fallback.model,
      fallbackPolicy: "downgraded",
      reason: `${modelDecision.reason}; ${guard.reason}`,
      legacyMode: downgradedTier === "PREMIUM" ? "premium" : "fast",
    };
  }

  if (guard.status === "blocked") {
    return {
      ...modelDecision,
      fallbackPolicy: "blocked",
      reason: `${modelDecision.reason}; ${guard.reason}`,
      legacyMode: "fast",
      tier: "ECONOMIC",
      provider: "legacy",
      model: "legacy",
    };
  }

  return { ...modelDecision, fallbackPolicy: "allow", reason: `${modelDecision.reason}; ${guard.reason}` };
}

export function buildModelRouterDecision(input: ModelRouteInput): ModelRouteDecision {
  return routeModelForTask(input);
}

export const DEFAULT_MODEL_ROUTER_POLICY = {
  maxEscalations: MAX_ESCALATIONS,
  fallbackPolicy: "allow" as FallbackPolicy,
};
