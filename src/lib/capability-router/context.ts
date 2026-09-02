import type { AssetJobRow } from "@/lib/asset-jobs/types";
import type { CapabilityId } from "@/lib/capability-router/capabilities";
import { getExecutionPolicies } from "@/lib/capability-router/policies";
import type {
  ExecutionContext,
  ExecutionPolicies,
} from "@/lib/capability-router/types";
import type { AssetStorageDriver } from "@/lib/storage/types";

export function createExecutionContext(input: {
  job: AssetJobRow;
  capability: CapabilityId;
  storage: AssetStorageDriver;
  policies?: ExecutionPolicies;
  processorTarget?: ExecutionContext["processorTarget"];
}): ExecutionContext {
  const policies = input.policies ?? getExecutionPolicies();
  return {
    capability: input.capability,
    jobId: input.job.id,
    workspaceId: input.job.workspace_id,
    projectId: input.job.project_id,
    assetId: input.job.asset_id,
    createdBy: input.job.created_by,
    assetKind: input.job.kind,
    inputPath: input.job.input_path,
    outputPath: input.job.output_path,
    storage: input.storage,
    policies,
    processorTarget: input.processorTarget ?? "local",
    params: input.job.meta ?? {},
  };
}
