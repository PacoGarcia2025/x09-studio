import { getAssetJobStaleMs, ASSET_JOB_TICK_MAX_DURATION_SEC } from "@/lib/asset-jobs/config";
import { getAssetProcessor } from "@/lib/asset-jobs/processors/registry";
import { getExecutionPolicies } from "@/lib/capability-router/policies";
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
    modelsLoaded: false,
    gpu: policies.gpuAvailable,
    jobStaleMs: getAssetJobStaleMs(),
    tickMaxDurationSec: ASSET_JOB_TICK_MAX_DURATION_SEC,
  });
}
