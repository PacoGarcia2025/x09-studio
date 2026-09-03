import type { AssetJobOperation, AssetJobRow } from "@/lib/asset-jobs/types";
import type { AssetStorageDriver } from "@/lib/storage/types";

export type AssetProcessorResult = {
  status: "done" | "skipped" | "failed" | "waiting";
  outputPath?: string | null;
  message: string;
  meta?: Record<string, unknown>;
};

export type AssetProcessorContext = {
  job: AssetJobRow;
  storage: AssetStorageDriver;
};

/**
 * Processor da fila — desconhece Trellis/Hunyuan.
 * Fase 4 conecta implementations reais sem mudar a fila.
 */
export interface AssetProcessor {
  readonly id: string;
  process(ctx: AssetProcessorContext): Promise<AssetProcessorResult>;
}

export function operationsHandledByStub(): AssetJobOperation[] {
  return ["ingest"];
}
