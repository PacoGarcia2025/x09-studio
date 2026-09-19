import { createServiceClient } from "@/lib/supabase/service-client";
import { getAssetStorage } from "@/lib/storage/registry";
import { AssetVisionInput, AssetVisionResult } from "@/lib/assets/providers/vision-types";
import { OpenAiVisionProvider } from "@/lib/assets/providers/openai-vision";
import sizeOf from "image-size";

export interface ValidateAssetInput {
  candidateId: string;
  projectId?: string; // Optional for external/user upload if not strict
  userId: string;
}

export async function validateAssetCandidate(input: ValidateAssetInput) {
  const supabase = createServiceClient();

  // 1. Verificação de ownership / existência
  const { data: candidate, error: candidateErr } = await supabase
    .from("asset_candidates")
    .select("*, asset_requests(*)")
    .eq("id", input.candidateId)
    .single();

  if (candidateErr || !candidate) {
    throw new Error(`Candidato não encontrado: ${input.candidateId}`);
  }

  // 2. Idempotência: Se já houver validação final, retorna
  const { data: existingValidation } = await supabase
    .from("asset_validations")
    .select("*")
    .eq("asset_candidate_id", input.candidateId)
    .maybeSingle();

  if (existingValidation) {
    return existingValidation;
  }

  // 3. Obter os bytes e MIME da imagem para Checks Determinísticos
  const storageDriver = getAssetStorage();
  let imageBuffer: Buffer;
  let mimeType = candidate.format === "png" ? "image/png" : "image/jpeg"; // default fallback

  try {
    if (candidate.origin === "external_source") {
      // Baixar do Unsplash
      const res = await fetch(candidate.asset_url);
      if (!res.ok) throw new Error("Não foi possível acessar a URL externa.");
      imageBuffer = Buffer.from(await res.arrayBuffer());
      mimeType = res.headers.get("content-type") || mimeType;
    } else {
      // Local storage (user_upload ou ai_generated)
      const relativePath = candidate.asset_url.replace(/^\//, ""); // remove leading slash
      imageBuffer = await storageDriver.readFile(relativePath);
      
      if (candidate.asset_url.endsWith(".png")) mimeType = "image/png";
      if (candidate.asset_url.endsWith(".webp")) mimeType = "image/webp";
    }
  } catch (err: any) {
    return persistValidation(input.candidateId, candidate, {
      relevance_score: null,
      quality_score: null,
      composition_check: null,
      visual_coherence: null,
      purpose_adherence: null,
      rejection_reason: `Falha determinística: Arquivo ilegível ou inexistente (${err.message})`,
      final_result: "rejected"
    });
  }

  // 4. Checks Determinísticos: Dimensões e MIME
  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMimes.includes(mimeType)) {
    return persistValidation(input.candidateId, candidate, {
      relevance_score: null, quality_score: null, composition_check: null, visual_coherence: null, purpose_adherence: null,
      rejection_reason: `Falha determinística: MIME type inválido (${mimeType})`,
      final_result: "rejected"
    });
  }

  let dimensions: { width: number; height: number };
  try {
    const size = sizeOf(imageBuffer);
    if (!size.width || !size.height) throw new Error("Dimensões não detectadas");
    dimensions = { width: size.width, height: size.height };
  } catch (err) {
    return persistValidation(input.candidateId, candidate, {
      relevance_score: null, quality_score: null, composition_check: null, visual_coherence: null, purpose_adherence: null,
      rejection_reason: "Falha determinística: Imagem corrompida ou formato inválido",
      final_result: "rejected"
    });
  }

  // Aspect Ratio vs Orientation do Asset Request
  const request = candidate.asset_requests || {};
  const isLandscape = dimensions.width > dimensions.height;
  const isPortrait = dimensions.height > dimensions.width;

  if (request.orientation === "landscape" && !isLandscape) {
    return persistValidation(input.candidateId, candidate, {
      relevance_score: null, quality_score: null, composition_check: null, visual_coherence: null, purpose_adherence: null,
      rejection_reason: "Falha determinística: Orientation incompatível (exigido landscape, recebido portrait/square)",
      final_result: "rejected"
    });
  }
  if (request.orientation === "portrait" && !isPortrait) {
    return persistValidation(input.candidateId, candidate, {
      relevance_score: null, quality_score: null, composition_check: null, visual_coherence: null, purpose_adherence: null,
      rejection_reason: "Falha determinística: Orientation incompatível (exigido portrait, recebido landscape/square)",
      final_result: "rejected"
    });
  }

  // Se tem aspect_ratio exigido (ex: "16:9") e o candidato tem dimensões que chocam frontalmente, reprova.
  if (request.aspect_ratio) {
    const ratioMap: Record<string, number> = { "16:9": 16/9, "9:16": 9/16, "4:3": 4/3, "3:4": 3/4, "1:1": 1 };
    const expectedRatio = ratioMap[request.aspect_ratio];
    const actualRatio = dimensions.width / dimensions.height;
    
    if (expectedRatio) {
      const diff = Math.abs(expectedRatio - actualRatio);
      // Tolerance of 10% for rounding
      if (diff > 0.1) {
         return persistValidation(input.candidateId, candidate, {
          relevance_score: null, quality_score: null, composition_check: null, visual_coherence: null, purpose_adherence: null,
          rejection_reason: `Falha determinística: Aspect Ratio incompatível (exigido ${request.aspect_ratio}, real ~${actualRatio.toFixed(2)})`,
          final_result: "rejected"
        });
      }
    }
  }

  // 5. Vision Provider
  const visionInput: AssetVisionInput = {
    candidateId: input.candidateId,
    assetRequest: request,
    candidate,
    imageBytes: imageBuffer,
    mimeType
  };

  let visionResult: AssetVisionResult;
  try {
    const provider = new OpenAiVisionProvider();
    visionResult = await provider.validateAsset(visionInput);
  } catch (err: any) {
    // Falha de provider (timeout, API fora do ar) gera needs_review ou rejected com erro em vez de loop infinito.
    return persistValidation(input.candidateId, candidate, {
      relevance_score: null, quality_score: null, composition_check: null, visual_coherence: null, purpose_adherence: null,
      rejection_reason: `Falha do VisionProvider: ${err.message}`,
      final_result: "needs_review"
    });
  }

  // 6. Decisão Baseada em JSON (Sem thresholds hardcoded)
  let finalResult: "approved" | "rejected" | "needs_review" = "needs_review";

  if (
    visionResult.composition_check === false || 
    visionResult.visual_coherence === false || 
    visionResult.purpose_adherence === false
  ) {
    finalResult = "rejected";
  } else if (
    visionResult.composition_check === true && 
    visionResult.visual_coherence === true && 
    visionResult.purpose_adherence === true &&
    visionResult.relevance_score !== null && visionResult.quality_score !== null
  ) {
    // Se a IA confirmar que é coerente, a composição é boa e atende ao propósito, aprovado.
    finalResult = "approved";
  }

  // Se foi rejeitado pela IA e a IA preencheu rejection_reason, usa. Caso contrário preenche fallback.
  const finalReason = finalResult === "rejected" 
    ? (visionResult.rejection_reason || "Rejeitado pela análise visual por incompatibilidade objetiva.")
    : undefined;

  // 7. Persistência
  return persistValidation(input.candidateId, candidate, {
    ...visionResult,
    final_result: finalResult,
    rejection_reason: finalReason
  });
}

/**
 * Função utilitária para gravar `asset_validations` e promover o candidate se aprovado.
 */
async function persistValidation(candidateId: string, candidate: any, result: any) {
  const supabase = createServiceClient();
  
  // Tratar licença baseado na origem
  let safetyLicense = null;
  if (candidate.origin === "user_upload") safetyLicense = true;
  else if (candidate.origin === "external_source") safetyLicense = !!candidate.meta?.license;
  else if (candidate.origin === "ai_generated") safetyLicense = true;

  const validationInsert = {
    workspace_id: candidate.workspace_id,
    project_id: candidate.project_id,
    asset_candidate_id: candidateId,
    relevance_score: result.relevance_score,
    quality_score: result.quality_score,
    composition_check: result.composition_check,
    visual_coherence: result.visual_coherence,
    purpose_adherence: result.purpose_adherence,
    format_check: true, // Se chegou até aqui, o format_check determinístico acima passou (se falhou, foi capturado no trycatch early return e a function persistValidation é chamada tbm)
    safety_license_check: safetyLicense,
    final_result: result.final_result,
    rejection_reason: result.rejection_reason,
    meta: {
      origin: candidate.origin
    }
  };

  // Se o final_result for "rejected" mas a causa for format_check, marcamos false.
  if (result.final_result === "rejected" && result.rejection_reason?.includes("Falha determinística: MIME")) {
    validationInsert.format_check = false;
  }

  const { data: savedValidation, error: validationErr } = await supabase
    .from("asset_validations")
    .insert(validationInsert)
    .select("*")
    .single();

  if (validationErr) {
    throw new Error(`Falha ao salvar validação: ${validationErr.message}`);
  }

  // 8. Promoção a asset (se approved)
  if (result.final_result === "approved") {
    // Insere em public.assets
    const assetInsert = {
      workspace_id: candidate.workspace_id,
      project_id: candidate.project_id,
      created_by: candidate.meta?.user_id || "00000000-0000-0000-0000-000000000000", // System fallback ou usuário que aprovou
      kind: "image",
      source: candidate.origin === "external_source" ? "imported" : (candidate.origin === "ai_generated" ? "generated" : "upload"),
      original_name: candidate.title || `Asset ${candidateId}`,
      storage_path: candidate.asset_url,
      mime_type: candidate.asset_url.endsWith(".png") ? "image/png" : "image/jpeg",
      byte_size: 0, // Should be calculated but we don't strict block on it yet if not downloaded
      status: "ready"
    };

    const { data: newAsset, error: assetErr } = await supabase
      .from("assets")
      .insert(assetInsert)
      .select("id")
      .single();

    if (!assetErr && newAsset) {
      await supabase
        .from("asset_candidates")
        .update({ final_asset_id: newAsset.id })
        .eq("id", candidateId);
    }
  }

  return savedValidation;
}
