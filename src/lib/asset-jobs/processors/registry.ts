import { createLocalAssetProcessor } from "@/lib/asset-jobs/processors/local";
import type { AssetProcessor } from "@/lib/asset-jobs/processor";
import { isAssetProcessorId, type AssetProcessorId } from "@/lib/asset-jobs/types";

function getConfiguredProcessorId(): AssetProcessorId {
  const raw = process.env.STUDIO_ASSET_PROCESSOR?.trim().toLowerCase();
  if (raw && isAssetProcessorId(raw)) return raw;
  return "local";
}

export function getAssetProcessor(
  id: AssetProcessorId = getConfiguredProcessorId(),
): AssetProcessor {
  if (id === "future") {
    return {
      id: "future",
      async process() {
        return {
          status: "skipped",
          message: "Processor future ainda não conectado.",
          meta: { stub: true },
        };
      },
    };
  }
  return createLocalAssetProcessor();
}
