import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssetRequestRow, AssetCandidateStatus, AssetCandidateOrigin } from "@/lib/assets/intelligence.types";
import { UnsplashProvider } from "@/lib/assets/providers/unsplash";
import type { AssetSearchProvider, AssetSearchQuery, AssetSearchResult } from "@/lib/assets/providers/types";

export async function processAssetRequest(
  request: AssetRequestRow,
  supabase: SupabaseClient,
  providers: AssetSearchProvider[] = [new UnsplashProvider()]
): Promise<void> {
  const query: AssetSearchQuery = {
    subject: request.subject || request.purpose,
    orientation: request.orientation as AssetSearchQuery["orientation"] || null,
    style: request.style,
  };

  // Coleta resultados de todos os provedores injetados
  const searchPromises = providers.map((p) => p.search(query));
  const resultsArray = await Promise.all(searchPromises);
  const allCandidates = resultsArray.flat();

  if (allCandidates.length === 0) {
    return;
  }

  // Deduplicação básica baseada nos candidatos existentes para este asset_request_id
  const { data: existingCandidates } = await supabase
    .from("asset_candidates")
    .select("provider, provider_asset_id")
    .eq("asset_request_id", request.id);

  const existingSet = new Set(
    (existingCandidates || []).map((c) => `${c.provider}:${c.provider_asset_id}`)
  );

  const newCandidates = allCandidates.filter(
    (c) => !existingSet.has(`${c.provider}:${c.provider_asset_id}`)
  );

  if (newCandidates.length === 0) {
    return;
  }

  const rowsToInsert = newCandidates.map((c) => ({
    workspace_id: request.workspace_id,
    project_id: request.project_id,
    asset_request_id: request.id,
    origin: "external_source" as AssetCandidateOrigin,
    provider: c.provider,
    provider_asset_id: c.provider_asset_id,
    source_url: c.source_url,
    asset_url: c.asset_url,
    title: c.title,
    description: c.description,
    author: c.author,
    license: c.license,
    dimensions: c.dimensions,
    format: c.format,
    status: "pending" as AssetCandidateStatus,
    meta: c.meta || {},
  }));

  const { error } = await supabase.from("asset_candidates").insert(rowsToInsert);
  if (error) {
    console.error(`[processAssetRequest] Falha ao inserir candidatos para request ${request.id}:`, error);
    throw new Error(`Insert asset_candidates failed: ${error.message}`);
  }
}
