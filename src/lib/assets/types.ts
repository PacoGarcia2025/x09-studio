import type {
  AssetKind,
  AssetLibraryStatus,
  AssetSource,
} from "@/lib/assets/kinds";
import type { AssetJobRow } from "@/lib/asset-jobs/types";

export type AssetRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  created_by: string;
  kind: AssetKind;
  source: AssetSource;
  status: AssetLibraryStatus;
  original_name: string;
  storage_path: string;
  mime_type: string | null;
  byte_size: number;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AssetWithJobs = AssetRow & {
  jobs: AssetJobRow[];
};

export type AssetActionResult =
  | { ok: true; assetId?: string; jobId?: string }
  | { ok: false; error: string };
