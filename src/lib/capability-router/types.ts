import type { AssetKind } from "@/lib/assets/kinds";
import type { CapabilityId } from "@/lib/capability-router/capabilities";
import type { AssetStorageDriver } from "@/lib/storage/types";

export type ProviderStatus = "ready" | "planned" | "unavailable";

/**
 * Manifest fino. Campos opcionais existem no tipo para o futuro;
 * o Router só usa capabilities, priority, enabled, status, GPU e internet.
 */
export type ProviderManifest = {
  id: string;
  name: string;
  version: string;
  capabilities: readonly CapabilityId[];
  priority: number;
  status: ProviderStatus;
  requiresGpu: boolean;
  requiresInternet: boolean;
  /** API externa cobrada. O Router só inclui o provider se paidApisAllowed. */
  requiresPaidApi?: boolean;
  enabled: boolean;
  experimental?: boolean;
  supportsBatch?: boolean;
  supportsStreaming?: boolean;
  supportedInputKinds?: readonly AssetKind[];
  supportedOutputKinds?: readonly AssetKind[];
  estimatedCost?: number;
  estimatedExecutionTime?: number;
};

export type ExecutionPolicies = {
  generationEnabled: boolean;
  paidApisAllowed: boolean;
  gpuAvailable: boolean;
  internetAllowed: boolean;
};

export type ExecutionContext = {
  capability: CapabilityId;
  jobId: string;
  workspaceId: string;
  projectId: string | null;
  assetId: string | null;
  createdBy: string;
  assetKind: AssetKind;
  inputPath: string | null;
  outputPath: string | null;
  storage: AssetStorageDriver;
  policies: ExecutionPolicies;
  processorTarget: "local" | "gpu-worker";
  /** Cópia de `asset_jobs.meta` — parâmetros do pedido, sem o resto do Studio. */
  params: Record<string, unknown>;
};

export type ProviderResult = {
  /** waiting = a API externa ainda trabalha; a fila reenfileira o job. */
  status: "done" | "skipped" | "failed" | "waiting";
  outputPath?: string | null;
  message: string;
  meta?: Record<string, unknown>;
};

export interface CapabilityProvider {
  readonly manifest: ProviderManifest;
  execute(ctx: ExecutionContext): Promise<ProviderResult>;
}

export type ResolveResult =
  | { ok: true; provider: CapabilityProvider }
  | { ok: false; reason: string };
