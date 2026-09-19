import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssetRequestRow, AssetCandidateRow, AssetCandidateStatus, AssetCandidateOrigin } from "@/lib/assets/intelligence.types";
import { ASSET_GENERATION_COSTS } from "@/lib/billing/credits";
import { PublicError } from "@/lib/http/errors";

export type GenerationQuote = {
  candidateId: string;
  assetRequestId: string;
  assetType: "image" | "video";
  description: string;
  costCredits: number;
  message: string;
};

/**
 * Cria (ou retorna) uma cotação para gerar um asset usando IA, para o AssetRequest fornecido.
 */
export async function createGenerationQuote(
  supabase: SupabaseClient,
  request: AssetRequestRow,
  userId: string,
  assetType: "image" | "video" = "image"
): Promise<GenerationQuote> {
  // 1. Verifica segurança de workspace contra owner autenticado.
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", request.workspace_id)
    .single();

  if (!workspace || workspace.owner_id !== userId) {
    throw new PublicError("Sem permissão para este workspace", 403);
  }

  const costCredits = ASSET_GENERATION_COSTS[assetType];
  const description = request.subject || request.purpose;
  const message = `Posso criar um(a) ${assetType === "image" ? "imagem" : "vídeo"} exclusiva(o) para essa seção usando IA. Custo: ${costCredits} créditos.`;

  // 2. Busca cotação existente (candidate ai_generated em needs_review ou pending)
  const { data: existing } = await supabase
    .from("asset_candidates")
    .select("*")
    .eq("asset_request_id", request.id)
    .eq("origin", "ai_generated")
    .in("status", ["needs_review", "pending"])
    .maybeSingle();

  if (existing) {
    return {
      candidateId: existing.id,
      assetRequestId: request.id,
      assetType,
      description,
      costCredits: (existing.meta as Record<string, any>)?.quoted_cost || costCredits,
      message,
    };
  }

  // 3. Cria nova cotação
  const { data: candidate, error } = await supabase
    .from("asset_candidates")
    .insert({
      workspace_id: request.workspace_id,
      project_id: request.project_id,
      asset_request_id: request.id,
      origin: "ai_generated" as AssetCandidateOrigin,
      status: "needs_review" as AssetCandidateStatus,
      meta: {
        quoted_cost: costCredits,
        asset_type: assetType,
        description,
      },
    })
    .select()
    .single();

  if (error || !candidate) {
    throw new PublicError("Falha ao criar cotação de geração", 500);
  }

  return {
    candidateId: candidate.id,
    assetRequestId: request.id,
    assetType,
    description,
    costCredits,
    message,
  };
}

/**
 * Persiste o consentimento do usuário sobre a geração do asset.
 */
export async function submitGenerationConsent(
  supabase: SupabaseClient,
  candidateId: string,
  approved: boolean,
  userId: string
): Promise<void> {
  // 1. Pega o candidate
  const { data: candidate } = await supabase
    .from("asset_candidates")
    .select("*, workspaces!inner(owner_id)")
    .eq("id", candidateId)
    .eq("origin", "ai_generated")
    .single();

  if (!candidate) {
    throw new PublicError("Cotação não encontrada", 404);
  }

  // Validação de owner no schema do workspace atrelado
  // Note: Since workspaces is joined, we can check owner_id. We expect it to be a joined structure.
  // Em uma infra RLS real isso talvez nem precisasse manual, mas o requisito exige validação manual do workspace_id no server layer.
  if (candidate.workspaces?.owner_id !== userId) {
    throw new PublicError("Sem permissão para aprovar neste workspace", 403);
  }

  // Apenas podemos aprovar se estiver aguardando decisão
  if (candidate.status !== "needs_review" && candidate.status !== "pending") {
    throw new PublicError("Esta cotação já foi processada", 400);
  }

  const newStatus: AssetCandidateStatus = approved ? "approved" : "rejected";

  const { error } = await supabase
    .from("asset_candidates")
    .update({ status: newStatus })
    .eq("id", candidateId);

  if (error) {
    throw new PublicError("Falha ao registrar consentimento", 500);
  }
}
