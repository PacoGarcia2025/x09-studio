import type { ExecutionPolicies } from "@/lib/capability-router/types";
import { isCommercialMeshConfigured } from "@/lib/capability-router/providers/meshy-env";
import { isRunpodOnDemandConfigured } from "@/lib/capability-router/providers/runpod-pod";
import { runtimeEnv, runtimeEnvFlag } from "@/lib/env/runtime";

export function getExecutionPolicies(): ExecutionPolicies {
  return {
    generationEnabled: runtimeEnvFlag("STUDIO_AI_ENGINE_GENERATION_ENABLED"),
    paidApisAllowed:
      runtimeEnvFlag("STUDIO_ASSET_PAID_APIS") || isCommercialMeshConfigured(),
    gpuAvailable:
      runtimeEnvFlag("STUDIO_ASSET_GPU_AVAILABLE") ||
      isRunpodOnDemandConfigured(),
    internetAllowed: runtimeEnv("STUDIO_ASSET_INTERNET") !== "false",
  };
}
