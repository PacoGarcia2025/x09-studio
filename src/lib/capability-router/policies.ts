import type { ExecutionPolicies } from "@/lib/capability-router/types";
import { isCommercialMeshConfigured } from "@/lib/capability-router/providers/meshy-env";
import { isRunpodOnDemandConfigured } from "@/lib/capability-router/providers/runpod-pod";

export function getExecutionPolicies(): ExecutionPolicies {
  return {
    generationEnabled:
      process.env.STUDIO_AI_ENGINE_GENERATION_ENABLED?.trim() === "true",
    paidApisAllowed:
      process.env.STUDIO_ASSET_PAID_APIS?.trim() === "true" ||
      isCommercialMeshConfigured(),
    gpuAvailable:
      process.env.STUDIO_ASSET_GPU_AVAILABLE?.trim() === "true" ||
      isRunpodOnDemandConfigured(),
    internetAllowed: process.env.STUDIO_ASSET_INTERNET?.trim() !== "false",
  };
}
