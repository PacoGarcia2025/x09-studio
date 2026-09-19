export interface AssetSearchQuery {
  subject: string;
  orientation?: "landscape" | "portrait" | "squarish" | null;
  style?: string | null;
}

export interface AssetSearchResult {
  provider: string;
  provider_asset_id: string;
  source_url: string | null;
  asset_url: string | null;
  title: string | null;
  description: string | null;
  author: string | null;
  license: string | null;
  dimensions: string | null;
  format: string | null;
  meta: Record<string, unknown>;
}

export interface AssetSearchProvider {
  id: string;
  search(query: AssetSearchQuery): Promise<AssetSearchResult[]>;
}
