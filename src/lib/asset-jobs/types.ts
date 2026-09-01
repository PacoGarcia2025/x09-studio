import type { AssetKind } from "@/lib/assets/kinds";

export const ASSET_JOB_STATUSES = [
  "queued",
  "running",
  "retrying",
  "done",
  "failed",
  "skipped",
  "cancelled",
] as const;

export type AssetJobStatus = (typeof ASSET_JOB_STATUSES)[number];

/** Operação da fila universal — não é específica de IA. */
export const ASSET_JOB_OPERATIONS = [
  "ingest",
  "generate",
  "optimize",
  "convert",
  "compress",
  "thumbnail",
  "preview",
  "transcode",
  "import",
  "export",
] as const;

export type AssetJobOperation = (typeof ASSET_JOB_OPERATIONS)[number];

/** Quem executa o job. Motores (Trellis, etc.) só entram como processors na Fase 4+. */
export const ASSET_PROCESSOR_IDS = ["local", "future"] as const;

export type AssetProcessorId = (typeof ASSET_PROCESSOR_IDS)[number];

export type AssetJobRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  asset_id: string | null;
  created_by: string;
  kind: AssetKind;
  operation: AssetJobOperation;
  /** Coluna legado `provider_id` — trata-se do processor, não de um motor de IA. */
  provider_id: string;
  status: AssetJobStatus;
  input_path: string | null;
  output_path: string | null;
  error_message: string | null;
  meta: Record<string, unknown>;
  credits_reserved: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export function isAssetJobStatus(value: string): value is AssetJobStatus {
  return (ASSET_JOB_STATUSES as readonly string[]).includes(value);
}

export function isAssetJobOperation(value: string): value is AssetJobOperation {
  return (ASSET_JOB_OPERATIONS as readonly string[]).includes(value);
}

export function isAssetProcessorId(value: string): value is AssetProcessorId {
  return (ASSET_PROCESSOR_IDS as readonly string[]).includes(value);
}

export const ASSET_JOB_SELECT =
  "id, workspace_id, project_id, asset_id, created_by, kind, operation, provider_id, status, input_path, output_path, error_message, meta, credits_reserved, started_at, finished_at, created_at, updated_at";
