import { getAssetJobStaleMs, ASSET_JOB_TICK_MAX_DURATION_SEC } from "@/lib/asset-jobs/config";
import { getAssetProcessor } from "@/lib/asset-jobs/processors/registry";
import { getExecutionPolicies } from "@/lib/capability-router/policies";
import { isRunpodOnDemandConfigured } from "@/lib/capability-router/providers/runpod-pod";
import { runtimeEnvFlag } from "@/lib/env/runtime";
import { getAssetStorage, listAssetStorageDrivers } from "@/lib/storage/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const storage = getAssetStorage();
  const processor = getAssetProcessor();

  const policies = getExecutionPolicies();

  return Response.json({
    ok: storage.status === "ready",
    processor: processor.id,
    storage: {
      active: storage.id,
      status: storage.status,
      drivers: listAssetStorageDrivers().map((d) => ({
        id: d.id,
        status: d.status,
      })),
    },
    generationEnabled: policies.generationEnabled,
    gpuAvailable: policies.gpuAvailable,
    gpuFlag: runtimeEnvFlag("STUDIO_ASSET_GPU_AVAILABLE"),
    runpodConfigured: isRunpodOnDemandConfigured(),
    modelsLoaded: false,
    gpu: policies.gpuAvailable,
    jobStaleMs: getAssetJobStaleMs(),
    tickMaxDurationSec: ASSET_JOB_TICK_MAX_DURATION_SEC,
  });
}
