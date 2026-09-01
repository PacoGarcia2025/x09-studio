import { createExecutionContext } from "@/lib/capability-router/context";
import { capabilityFromJob } from "@/lib/capability-router/from-job";
import { getExecutionPolicies } from "@/lib/capability-router/policies";
import { resolveCapability } from "@/lib/capability-router/resolve";
import type {
  AssetProcessor,
  AssetProcessorResult,
} from "@/lib/asset-jobs/processor";

/**
 * Processor local: roteia pela capability. Não conhece motores.
 */
export function createLocalAssetProcessor(): AssetProcessor {
  return {
    id: "local",
    async process({ job, storage }): Promise<AssetProcessorResult> {
      const capability = capabilityFromJob(job);
      if (!capability) {
        return {
          status: "skipped",
          message: `Sem capability para ${job.kind}.${job.operation}`,
        };
      }

      const policies = getExecutionPolicies();
      const resolved = resolveCapability(capability, policies);
      if (!resolved.ok) {
        return {
          status: "skipped",
          message: resolved.reason,
          meta: { capability },
        };
      }

      const ctx = createExecutionContext({
        job,
        capability,
        storage,
        policies,
        processorTarget: "local",
      });

      const result = await resolved.provider.execute(ctx);
      return {
        ...result,
        meta: {
          ...result.meta,
          capability,
          providerId: resolved.provider.manifest.id,
        },
      };
    },
  };
}
