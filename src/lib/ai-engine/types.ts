import type { AssetKind } from "@/lib/assets/kinds";
import type { CapabilityId } from "@/lib/capability-router/capabilities";

export {
  ASSET_KINDS,
  isAssetKind,
  type AssetKind,
} from "@/lib/assets/kinds";

export {
  ASSET_JOB_STATUSES,
  isAssetJobStatus,
  type AssetJobStatus,
  type AssetJobRow,
} from "@/lib/asset-jobs/types";

/** Compat: id do provider no Router, nunca um motor concreto no Studio. */
export type AiAssetProviderId = string;

export type AiAssetProviderStatus = "ready" | "planned" | "unavailable";

export interface AiAssetProvider {
  readonly id: string;
  readonly label: string;
  readonly capabilities: readonly CapabilityId[] | readonly AssetKind[];
  readonly requiresGpu: boolean;
  readonly status: AiAssetProviderStatus;
}

export function isAiAssetProviderId(value: string): boolean {
  return value.trim().length > 0;
}
