import type { ExecutionPolicies } from "@/lib/capability-router/types";
import { isCommercialMeshConfigured } from "@/lib/capability-router/providers/meshy-env";

export function getExecutionPolicies(): ExecutionPolicies {
  return {
    generationEnabled:
      process.env.STUDIO_AI_ENGINE_GENERATION_ENABLED?.trim() === "true",
    paidApisAllowed:
      process.env.STUDIO_ASSET_PAID_APIS?.trim() === "true" ||
      isCommercialMeshConfigured(),
    gpuAvailable: process.env.STUDIO_ASSET_GPU_AVAILABLE?.trim() === "true",
    internetAllowed: process.env.STUDIO_ASSET_INTERNET?.trim() !== "false",
  };
}
