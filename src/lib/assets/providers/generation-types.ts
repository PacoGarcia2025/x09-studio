export interface AssetGenerationRequest {
  prompt: string;
  orientation: "landscape" | "portrait" | "square" | string;
  aspectRatio?: string;
  quality?: "standard" | "hd";
}

export interface AssetGenerationResult {
  ok: boolean;
  base64Data?: string;
  mimeType?: string;
  provider: string;
  error?: string;
}

export interface AssetGenerationProvider {
  id: string;
  generateImage(request: AssetGenerationRequest): Promise<AssetGenerationResult>;
}
