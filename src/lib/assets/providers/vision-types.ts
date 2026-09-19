export interface AssetVisionInput {
  candidateId: string;
  assetRequest: Record<string, any>; // O asset_requests row inteiro ou parcial
  candidate: Record<string, any>; // O asset_candidates row inteiro
  imageBytes: Buffer;
  mimeType: string;
}

export interface AssetVisionResult {
  relevance_score: number | null;
  quality_score: number | null;
  composition_check: boolean | null;
  visual_coherence: boolean | null;
  purpose_adherence: boolean | null;
  rejection_reason?: string;
}

export interface AssetVisionProvider {
  validateAsset(input: AssetVisionInput): Promise<AssetVisionResult>;
}
