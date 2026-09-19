import { createServiceClient } from "@/lib/supabase/service-client";
import { getAssetStorage } from "@/lib/storage/registry";
import {
  debitAssetJobCredits,
  refundAssetJobCredits,
} from "@/lib/billing/asset-job-credits";
import { ASSET_GENERATION_COSTS } from "@/lib/billing/credits";
import { OpenAiImageProvider } from "@/lib/assets/providers/openai-image";
import { AssetGenerationRequest } from "@/lib/assets/providers/generation-types";

function buildGenerationPrompt(assetRequest: any): string {
  const parts = [];
  if (assetRequest.style) parts.push(`A ${assetRequest.style} image of`);
  else parts.push(`An image of`);

  parts.push(assetRequest.subject || "a generic subject");

  if (assetRequest.purpose) {
    parts.push(`. Purpose: ${assetRequest.purpose}`);
  }
  if (assetRequest.composition) {
    parts.push(`. Composition: ${assetRequest.composition}`);
  }
  if (assetRequest.context_usage) {
    parts.push(`. Context: ${assetRequest.context_usage}`);
  }
  if (assetRequest.quality_requirements) {
    parts.push(`. Quality: ${assetRequest.quality_requirements}`);
  } else {
    parts.push(`. Quality: high quality, detailed`);
  }

  return parts.join("").trim();
}

export async function generateAssetFromCandidate(input: {
  userId: string;
  workspaceId: string;
  projectId: string;
  candidateId: string;
}) {
  const supabase = createServiceClient();

  // 1. Fetch Candidate and verify ownership
  const { data: candidate, error: candidateErr } = await supabase
    .from("asset_candidates")
    .select(`
      *,
      asset_requests (*)
    `)
    .eq("id", input.candidateId)
    .eq("workspace_id", input.workspaceId)
    .eq("project_id", input.projectId)
    .single();

  if (candidateErr || !candidate) {
    throw new Error("Candidato não encontrado ou acesso negado.");
  }

  if (candidate.origin !== "ai_generated") {
    throw new Error("Este candidato não é originado de IA.");
  }

  if (candidate.status !== "approved") {
    throw new Error("Apenas candidatos aprovados podem ser gerados.");
  }

  // 2. Fetch Cost
  const cost = ASSET_GENERATION_COSTS.image;

  // 3. Reserve Credits
  const debitResult = await debitAssetJobCredits({
    userId: input.userId,
    amount: cost,
    assetId: input.candidateId,
    meta: {
      action: "generate_image_phase_3_3",
      candidateId: input.candidateId,
    },
  });

  if (!debitResult.ok) {
    throw new Error("Falha ao debitar créditos para a geração.");
  }

  // 4. Generate Image via Provider
  const provider = new OpenAiImageProvider();
  const requestRow = candidate.asset_requests;

  const genRequest: AssetGenerationRequest = {
    prompt: buildGenerationPrompt(requestRow),
    aspectRatio: requestRow?.aspect_ratio,
    orientation: requestRow?.orientation || "square",
    quality: "hd",
  };

  const genResult = await provider.generateImage(genRequest);

  if (!genResult.ok || !genResult.base64Data) {
    // Refund
    await refundAssetJobCredits({
      userId: input.userId,
      amount: cost,
      assetId: input.candidateId,
    });

    // Mark failed
    await supabase
      .from("asset_candidates")
      .update({ status: "rejected", meta: { ...candidate.meta, error: genResult.error } })
      .eq("id", input.candidateId);

    throw new Error(`Falha na geração: ${genResult.error || "Erro desconhecido"}`);
  }

  // 5. Convert Base64 to Bytes
  const imageBuffer = Buffer.from(genResult.base64Data, "base64");

  // 6. Write to Storage
  const storageDriver = getAssetStorage();
  const relativePath = `projects/${input.projectId}/assets/generated/${input.candidateId}.png`;
  
  try {
    await storageDriver.writeFile(relativePath, imageBuffer);
  } catch (err: any) {
    // Storage failed, refund
    await refundAssetJobCredits({
      userId: input.userId,
      amount: cost,
      assetId: input.candidateId,
    });

    await supabase
      .from("asset_candidates")
      .update({ status: "rejected", meta: { ...candidate.meta, error: `Storage failure: ${err.message}` } })
      .eq("id", input.candidateId);

    throw new Error(`Falha ao salvar no storage: ${err.message}`);
  }

  // 7. Update Candidate Success
  const finalAssetUrl = `/${relativePath}`; // Local or configured prefix mapping could be used

  const { data: updatedCandidate, error: updateErr } = await supabase
    .from("asset_candidates")
    .update({
      status: "approved", // Mantém aprovado, a presença de asset_url define que gerou
      asset_url: finalAssetUrl,
      provider: provider.id,
      format: "png",
      meta: {
        ...candidate.meta,
        generatedAt: new Date().toISOString(),
        cost,
      },
    })
    .eq("id", input.candidateId)
    .select()
    .single();

  if (updateErr) {
    throw new Error(`Geração ocorreu, mas falhou ao atualizar candidato: ${updateErr.message}`);
  }

  return { ok: true, candidate: updatedCandidate };
}
