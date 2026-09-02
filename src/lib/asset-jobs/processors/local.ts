import { createExecutionContext } from "@/lib/capability-router/context";
import { capabilityFromJob } from "@/lib/capability-router/from-job";
import { getExecutionPolicies } from "@/lib/capability-router/policies";
import { listCapabilityCandidates } from "@/lib/capability-router/resolve";
import type {
  AssetProcessor,
  AssetProcessorResult,
} from "@/lib/asset-jobs/processor";

/**
 * Processor local: roteia pela capability. Não conhece motores.
 * Se um provider devolver skipped, tenta o próximo candidato.
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
      const candidates = listCapabilityCandidates(capability, policies);
      if (candidates.length === 0) {
        return {
          status: "skipped",
          message: `Nenhum provider habilitado para ${capability}`,
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

      let lastSkip: AssetProcessorResult | null = null;
      for (const provider of candidates) {
        const result = await provider.execute(ctx);
        if (result.status === "skipped") {
          lastSkip = {
            ...result,
            meta: {
              ...result.meta,
              capability,
              providerId: provider.manifest.id,
            },
          };
          continue;
        }
        if (result.status === "failed") {
          console.error(
            `[asset-job] ${job.id} ${capability} → ${provider.manifest.id}: ${result.message}`,
          );
        }
        return {
          ...result,
          meta: {
            ...result.meta,
            capability,
            providerId: provider.manifest.id,
          },
        };
      }

      return {
        status: "skipped",
        message:
          lastSkip?.message ?? `Nenhum provider aceitou ${capability}`,
        meta: { capability, ...(lastSkip?.meta ?? {}) },
      };
    },
  };
}
