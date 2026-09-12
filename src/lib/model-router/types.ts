export type TaskComplexity = "trivial" | "simple" | "medium" | "complex" | "critical";
export type TaskType =
  | "edit"
  | "generation"
  | "planning"
  | "debugging"
  | "repair"
  | "architecture"
  | "content"
  | "unknown";

export type ModelTier = "ECONOMIC" | "BALANCED" | "PREMIUM";
export type ProviderKey = "gemini" | "groq" | "openrouter" | "openai" | "claude" | "legacy";
export type FallbackPolicy = "allow" | "downgraded" | "blocked" | "fallback";

export type TaskClassification = {
  taskType: TaskType;
  complexity: TaskComplexity;
  reason: string;
};

export type ModelRouteInput = {
  request: string;
  taskType?: TaskType;
  complexity?: TaskComplexity;
  projectState?: {
    hasExistingApp?: boolean;
    repairCycles?: number;
  };
  contextMetrics?: {
    selectedFiles?: number;
    estimatedTokens?: number;
    totalTokens?: number;
  };
  repairIssues?: Array<{ file?: string; message: string; severity?: "error" | "warning" }>;
  repairCycles?: number;
  userModelPreference?: "cheap" | "balanced" | "premium" | "legacy";
  budget?: {
    maxTokens?: number;
    maxEstimatedCost?: number;
  };
};

export type ModelRouteDecision = {
  tier: ModelTier;
  provider: ProviderKey;
  model: string;
  type: TaskType;
  complexity: TaskComplexity;
  reason: string;
  estimatedTokens: number;
  estimatedCost: number | null;
  fallbackPolicy: FallbackPolicy;
  legacyMode: "edit" | "fast" | "plan" | "premium" | "repair";
  escalationLevel: number;
  taskType: TaskType;
};

export type CostGuardResult = {
  status: "allowed" | "downgraded" | "blocked" | "fallback";
  reason: string;
  appliedModel?: ModelTier;
  downgradedTo?: ModelTier;
  estimatedTokens: number;
  estimatedCost: number | null;
};
