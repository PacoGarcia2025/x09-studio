export type VisualBriefRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  business: string | null;
  niche: string | null;
  audience: string | null;
  objective: string | null;
  visual_style: string | null;
  brand_identity: string | null;
  palette: Record<string, unknown> | null;
  typography: Record<string, unknown> | null;
  references_urls: string[] | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AssetRequestStatus =
  | "pending"
  | "generating"
  | "searching"
  | "fulfilled"
  | "failed";

export type AssetRequestRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  visual_brief_id: string | null;
  purpose: string;
  subject: string | null;
  description: string | null;
  composition: string | null;
  orientation: string | null;
  aspect_ratio: string | null;
  style: string | null;
  quality_requirements: string | null;
  context_usage: string | null;
  page_relation: string | null;
  status: AssetRequestStatus;
  created_at: string;
  updated_at: string;
};

export type AssetCandidateOrigin =
  | "user_upload"
  | "external_source"
  | "ai_generated";

export type AssetCandidateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_review";

export type AssetCandidateRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  asset_request_id: string;
  final_asset_id: string | null;
  origin: AssetCandidateOrigin;
  provider: string | null;
  provider_asset_id: string | null;
  source_url: string | null;
  asset_url: string | null;
  title: string | null;
  description: string | null;
  author: string | null;
  license: string | null;
  dimensions: string | null;
  format: string | null;
  status: AssetCandidateStatus;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AssetValidationResult = "approved" | "rejected" | "needs_review";

export type AssetValidationRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  asset_candidate_id: string;
  relevance_score: number | null;
  quality_score: number | null;
  composition_check: boolean | null;
  visual_coherence: boolean | null;
  purpose_adherence: boolean | null;
  format_check: boolean | null;
  safety_license_check: boolean | null;
  final_result: AssetValidationResult;
  rejection_reason: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};
