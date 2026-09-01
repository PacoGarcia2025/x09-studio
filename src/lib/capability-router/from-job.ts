import type { AssetJobOperation } from "@/lib/asset-jobs/types";
import type { AssetKind } from "@/lib/assets/kinds";
import {
  isCapabilityId,
  type CapabilityId,
} from "@/lib/capability-router/capabilities";
import type { AssetJobRow } from "@/lib/asset-jobs/types";

export function capabilityFromKindOperation(
  kind: AssetKind,
  operation: AssetJobOperation,
): CapabilityId | null {
  if (operation === "ingest") return "asset.ingest";
  const candidate = `${kind}.${operation}`;
  return isCapabilityId(candidate) ? candidate : null;
}

export function capabilityFromJob(job: AssetJobRow): CapabilityId | null {
  const fromMeta = job.meta?.capability;
  if (typeof fromMeta === "string" && isCapabilityId(fromMeta)) {
    return fromMeta;
  }
  return capabilityFromKindOperation(job.kind, job.operation);
}
