"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import {
  assertProjectInWorkspace,
  assertWorkspaceOwner,
} from "@/lib/ai-engine/ownership";
import type { AssetJobRow } from "@/lib/asset-jobs/types";
import { ASSET_JOB_SELECT } from "@/lib/asset-jobs/types";
import {
  classifyUpload,
  isAllowedByteSize,
} from "@/lib/assets/classify";
import { buildAssetRelativeFile } from "@/lib/assets/paths";
import {
  SCHEMA_PENDING_MESSAGE,
  isMissingRelationError,
} from "@/lib/assets/schema";
import {
  removeAssetDir,
  writeAssetFile,
} from "@/lib/assets/storage.server";
import type { AssetActionResult, AssetRow, AssetWithJobs } from "@/lib/assets/types";
import {
  creditCostForMeshJob,
  isCommercialMeshTier,
  parseMeshTier,
  type MeshTier,
} from "@/lib/assets/mesh-tiers";
import {
  AssetJobCreditError,
  debitAssetJobCredits,
  refundReservedAssetJobCredits,
} from "@/lib/billing/asset-job-credits";
import type { CapabilityId } from "@/lib/capability-router/capabilities";
import { getExecutionPolicies } from "@/lib/capability-router/policies";
import { isCommercialMeshConfigured } from "@/lib/capability-router/providers/meshy-env";
import { clampLogoThickness } from "@/lib/capability-router/providers/logo-plate-thickness";
import { resolveCapability } from "@/lib/capability-router/resolve";

const ASSET_SELECT =
  "id, workspace_id, project_id, created_by, kind, source, status, original_name, storage_path, mime_type, byte_size, meta, created_at, updated_at";

const JOB_SELECT = ASSET_JOB_SELECT;

function revalidateAssetPages() {
  revalidatePath("/assets");
  revalidatePath("/biblioteca");
}

function sanitizeGenerationPrompt(
  raw: string,
): string | { ok: false; error: string } {
  const prompt = raw.trim();
  if (prompt.length < 3) {
    return { ok: false, error: "Descreva o pedido (mínimo 3 caracteres)." };
  }
  if (prompt.length > 800) {
    return { ok: false, error: "Prompt demasiado longo (máximo 800 caracteres)." };
  }
  return prompt;
}

function slugFromPrompt(prompt: string): string {
  const slug = prompt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "texto";
}

export async function listLibraryAssets(): Promise<
  | { ok: true; assets: AssetWithJobs[]; schemaReady: true }
  | { ok: true; assets: []; schemaReady: false; error: string }
  | { ok: false; error: string }
> {
  const gate = await assertWorkspaceOwner();
  if (gate.error || !gate.user || !gate.workspaceId) {
    return { ok: false, error: gate.error ?? "Erro ao validar workspace" };
  }

  const { data, error } = await gate.supabase
    .from("assets")
    .select(ASSET_SELECT)
    .eq("workspace_id", gate.workspaceId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return { ok: true, assets: [], schemaReady: false, error: SCHEMA_PENDING_MESSAGE };
    }
    return { ok: false, error: error.message };
  }

  const { data: jobs, error: jobError } = await gate.supabase
    .from("asset_jobs")
    .select(JOB_SELECT)
    .eq("workspace_id", gate.workspaceId)
    .order("created_at", { ascending: false });

  if (jobError) {
    if (isMissingRelationError(jobError)) {
      return { ok: true, assets: [], schemaReady: false, error: SCHEMA_PENDING_MESSAGE };
    }
    return { ok: false, error: jobError.message };
  }

  const byAsset = new Map<string, AssetJobRow[]>();
  for (const job of (jobs ?? []) as AssetJobRow[]) {
    const key = job.asset_id ?? "";
    if (!key) continue;
    const list = byAsset.get(key) ?? [];
    list.push(job);
    byAsset.set(key, list);
  }

  const assets: AssetWithJobs[] = ((data ?? []) as AssetRow[]).map((asset) => ({
    ...asset,
    jobs: byAsset.get(asset.id) ?? [],
  }));

  return { ok: true, assets, schemaReady: true };
}

export async function uploadAssetAction(
  _prev: AssetActionResult | null,
  formData: FormData,
): Promise<AssetActionResult> {
  try {
    return await uploadAssetActionInner(formData);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao enviar o arquivo";
    if (/body.*exceeded|body.*limit|too large|payload/i.test(message)) {
      return {
        ok: false,
        error: "Arquivo acima do limite do servidor. Use até 24 MB.",
      };
    }
    return { ok: false, error: message };
  }
}

async function uploadAssetActionInner(
  formData: FormData,
): Promise<AssetActionResult> {
  const gate = await assertWorkspaceOwner();
  if (gate.error || !gate.user || !gate.workspaceId) {
    return { ok: false, error: gate.error ?? "Erro ao validar workspace" };
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo." };
  }
  if (!isAllowedByteSize(file.size)) {
    return { ok: false, error: "Arquivo acima do limite (24 MB)." };
  }

  const filename =
    file instanceof File && file.name.trim()
      ? file.name
      : String(formData.get("filename") ?? "arquivo");

  const classified = classifyUpload(
    filename,
    String(formData.get("kind") ?? "").trim() || null,
  );
  if ("error" in classified) {
    return { ok: false, error: classified.error };
  }

  const projectIdRaw = String(formData.get("project_id") ?? "").trim();
  const projectId: string | null = projectIdRaw || null;
  if (projectId) {
    const projectGate = await assertProjectInWorkspace(projectId, gate.workspaceId);
    if (!projectGate.ok) return { ok: false, error: projectGate.error };
  }

  const assetId = randomUUID();
  const bytes = new Uint8Array(await file.arrayBuffer());

  let storagePath: string;
  try {
    storagePath = await writeAssetFile({
      workspaceId: gate.workspaceId,
      kind: classified.kind,
      assetId,
      extension: classified.extension,
      bytes,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao gravar o arquivo",
    };
  }

  const { error: insertError } = await gate.supabase.from("assets").insert({
    id: assetId,
    workspace_id: gate.workspaceId,
    project_id: projectId,
    created_by: gate.user.id,
    kind: classified.kind,
    source: "upload",
    status: "ready",
    original_name: classified.originalName,
    storage_path: storagePath,
    mime_type: file.type || null,
    byte_size: file.size,
    meta: { extension: classified.extension, capability: "asset.ingest" },
  });

  if (insertError) {
    await removeAssetDir(gate.workspaceId, classified.kind, assetId).catch(
      () => undefined,
    );
    if (isMissingRelationError(insertError)) {
      return { ok: false, error: SCHEMA_PENDING_MESSAGE };
    }
    return { ok: false, error: insertError.message };
  }

  const { data: job, error: jobError } = await gate.supabase
    .from("asset_jobs")
    .insert({
      workspace_id: gate.workspaceId,
      project_id: projectId,
      asset_id: assetId,
      created_by: gate.user.id,
      kind: classified.kind,
      operation: "ingest",
      provider_id: "local",
      status: "queued",
      input_path: storagePath,
      meta: { trigger: "upload", capability: "asset.ingest" },
      credits_reserved: 0,
    })
    .select("id")
    .single();

  if (jobError) {
    if (isMissingRelationError(jobError)) {
      revalidateAssetPages();
      return { ok: false, error: SCHEMA_PENDING_MESSAGE };
    }
    return { ok: false, error: jobError.message };
  }

  revalidateAssetPages();
  return { ok: true, assetId, jobId: job?.id };
}

/**
 * Enfileira mesh.generate. Não conhece o motor — só capability + meshTier.
 */
export async function enqueueMeshGenerateAction(
  sourceAssetId?: string,
  meshTier: MeshTier = "gpu",
  options?: { forGame?: boolean },
): Promise<AssetActionResult> {
  const tier = parseMeshTier(meshTier) ?? "gpu";
  const commercial = isCommercialMeshTier(tier);
  const forGame = Boolean(options?.forGame) && commercial;
  return enqueueMeshJob({
    capability: "mesh.generate",
    sourceAssetId,
    nameSuffix: forGame
      ? "jogo"
      : tier === "flagship"
        ? "qualidade"
        : commercial
          ? "comercial"
          : "objeto",
    requireImageIfGpu: !commercial,
    requireImage: commercial,
    extraMeta: {
      meshTier: tier,
      ...(forGame ? { poseMode: "t-pose", rigForGame: true } : {}),
    },
    commercial,
  });
}

export async function enqueueTextTo3dAction(
  prompt: string,
  meshTier: MeshTier = "game",
  options?: { forGame?: boolean },
): Promise<AssetActionResult> {
  const cleaned = sanitizeGenerationPrompt(prompt);
  if (typeof cleaned !== "string") return cleaned;
  const tier = parseMeshTier(meshTier);
  if (tier !== "game" && tier !== "flagship") {
    return { ok: false, error: "Escolha qualidade comercial ou alta qualidade." };
  }
  const forGame = Boolean(options?.forGame);
  return enqueueMeshJob({
    capability: "mesh.generate",
    nameSuffix: forGame ? "jogo" : tier === "flagship" ? "texto-hq" : "texto",
    requireImageIfGpu: false,
    extraMeta: {
      meshTier: tier,
      prompt: cleaned,
      sourceMode: "text",
      ...(forGame ? { poseMode: "t-pose", rigForGame: true } : {}),
    },
    commercial: true,
    fallbackName: slugFromPrompt(cleaned),
  });
}

export async function enqueueMeshRigAction(
  sourceAssetId: string,
): Promise<AssetActionResult> {
  return enqueueMeshJob({
    capability: "mesh.generate",
    sourceAssetId,
    sourceKind: "mesh",
    nameSuffix: "jogo",
    requireImageIfGpu: false,
    extraMeta: {
      meshTier: "game",
      sourceMode: "rig",
      rigForGame: true,
      poseMode: "t-pose",
    },
    commercial: true,
  });
}

export async function enqueueRetextureAction(
  sourceAssetId: string,
  prompt: string,
): Promise<AssetActionResult> {
  const cleaned = sanitizeGenerationPrompt(prompt);
  if (typeof cleaned !== "string") return cleaned;
  return enqueueMeshJob({
    capability: "texture.generate",
    sourceAssetId,
    sourceKind: "mesh",
    nameSuffix: "retextura",
    requireImageIfGpu: false,
    extraMeta: { prompt: cleaned, sourceMode: "retexture" },
    commercial: true,
  });
}

export async function enqueueLogoPlateAction(
  sourceAssetId?: string,
  thickness?: number,
): Promise<AssetActionResult> {
  return enqueueMeshJob({
    capability: "mesh.logo",
    sourceAssetId,
    nameSuffix: "logo",
    requireImageIfGpu: false,
    requireImage: true,
    extraMeta: { thickness: clampLogoThickness(thickness) },
  });
}

async function enqueueMeshJob(input: {
  capability: CapabilityId;
  sourceAssetId?: string;
  nameSuffix: string;
  requireImageIfGpu: boolean;
  requireImage?: boolean;
  extraMeta?: Record<string, unknown>;
  commercial?: boolean;
  sourceKind?: "image" | "mesh";
  fallbackName?: string;
}): Promise<AssetActionResult> {
  try {
    return await enqueueMeshJobInner(input);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Falha ao enfileirar o job.",
    };
  }
}

async function enqueueMeshJobInner(input: {
  capability: CapabilityId;
  sourceAssetId?: string;
  nameSuffix: string;
  requireImageIfGpu: boolean;
  requireImage?: boolean;
  extraMeta?: Record<string, unknown>;
  commercial?: boolean;
  sourceKind?: "image" | "mesh";
  fallbackName?: string;
}): Promise<AssetActionResult> {
  const gate = await assertWorkspaceOwner();
  if (gate.error || !gate.user || !gate.workspaceId) {
    return { ok: false, error: gate.error ?? "Erro ao validar workspace" };
  }

  const policies = getExecutionPolicies();
  if (input.commercial) {
    if (!policies.generationEnabled) {
      return { ok: false, error: `Geração desligada para ${input.capability}` };
    }
    if (!policies.paidApisAllowed) {
      return {
        ok: false,
        error: "APIs pagas desligadas (STUDIO_ASSET_PAID_APIS).",
      };
    }
    if (!policies.internetAllowed) {
      return {
        ok: false,
        error: "Internet desligada para geração comercial.",
      };
    }
    if (!isCommercialMeshConfigured()) {
      return {
        ok: false,
        error: "Geração comercial não configurada.",
      };
    }
  } else {
    const resolved = resolveCapability(input.capability, policies);
    if (!resolved.ok) {
      return { ok: false, error: resolved.reason };
    }
  }

  const resolved = resolveCapability(input.capability, policies);
  const needsImage =
    input.requireImage ||
    (input.requireImageIfGpu &&
      resolved.ok &&
      resolved.provider.manifest.requiresGpu);
  if (needsImage && !input.sourceAssetId) {
    return {
      ok: false,
      error:
        input.capability === "mesh.logo"
          ? "Logo precisa de uma imagem. Use «Gerar logo» no arquivo da biblioteca."
          : "Gerar objeto 3D precisa de uma imagem. Use o botão no arquivo da biblioteca.",
    };
  }

  let projectId: string | null = null;
  let inputPath: string | null = null;
  let sourceName = input.fallbackName ?? "exemplo";
  const sourceAssetId = input.sourceAssetId;
  const expectedKind = input.sourceKind ?? "image";

  if (sourceAssetId) {
    const { data: source, error } = await gate.supabase
      .from("assets")
      .select(
        "id, workspace_id, project_id, kind, original_name, storage_path, status, byte_size",
      )
      .eq("id", sourceAssetId)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        return { ok: false, error: SCHEMA_PENDING_MESSAGE };
      }
      return { ok: false, error: error.message };
    }
    if (!source || source.workspace_id !== gate.workspaceId) {
      return { ok: false, error: "Asset de origem não encontrado" };
    }
    if (source.status === "archived") {
      return { ok: false, error: "Asset de origem arquivado" };
    }
    if (source.kind !== expectedKind) {
      return {
        ok: false,
        error:
          expectedKind === "mesh"
            ? "Esta ação espera um objeto 3D da biblioteca."
            : `${input.capability} a partir de um asset espera uma imagem.`,
      };
    }
    if (expectedKind === "mesh" && !(source.byte_size > 0)) {
      return {
        ok: false,
        error: "Mesh de origem ainda sem arquivo. Processe o job e tente de novo.",
      };
    }
    projectId = source.project_id;
    inputPath = source.storage_path;
    sourceName = source.original_name.replace(/\.[^.]+$/, "") || sourceName;
    if (needsImage && !inputPath) {
      return {
        ok: false,
        error: "Imagem de origem sem arquivo no storage. Espere o ingest terminar.",
      };
    }
    if (expectedKind === "mesh" && !inputPath) {
      return { ok: false, error: "Mesh de origem sem arquivo no storage." };
    }
  }

  const assetId = randomUUID();
  const storagePath = buildAssetRelativeFile(
    gate.workspaceId,
    "mesh",
    assetId,
    "glb",
  );
  const originalName = `${sourceName}-${input.nameSuffix}.glb`;

  const { error: insertError } = await gate.supabase.from("assets").insert({
    id: assetId,
    workspace_id: gate.workspaceId,
    project_id: projectId,
    created_by: gate.user.id,
    kind: "mesh",
    source: "generated",
    status: "ready",
    original_name: originalName,
    storage_path: storagePath,
    mime_type: "model/gltf-binary",
    byte_size: 0,
    meta: {
      extension: "glb",
      capability: input.capability,
      source_asset_id: sourceAssetId ?? null,
      ...input.extraMeta,
    },
  });

  if (insertError) {
    if (isMissingRelationError(insertError)) {
      return { ok: false, error: SCHEMA_PENDING_MESSAGE };
    }
    return { ok: false, error: insertError.message };
  }

  const creditCost = creditCostForMeshJob({
    capability: input.capability,
    meshTier: input.extraMeta?.meshTier,
    requiresGpu:
      resolved.ok && resolved.provider.manifest.requiresGpu && !input.commercial,
    rigForGame: Boolean(input.extraMeta?.rigForGame),
    sourceMode: input.extraMeta?.sourceMode,
  });

  try {
    await debitAssetJobCredits({
      userId: gate.user.id,
      amount: creditCost,
      assetId,
      meta: {
        capability: input.capability,
        meshTier: input.extraMeta?.meshTier ?? null,
      },
    });
  } catch (err) {
    await gate.supabase.from("assets").delete().eq("id", assetId);
    const message =
      err instanceof AssetJobCreditError
        ? err.message
        : "Falha ao debitar créditos.";
    return { ok: false, error: message };
  }

  const { data: job, error: jobError } = await gate.supabase
    .from("asset_jobs")
    .insert({
      workspace_id: gate.workspaceId,
      project_id: projectId,
      asset_id: assetId,
      created_by: gate.user.id,
      kind: "mesh",
      operation: "generate",
      provider_id: "local",
      status: "queued",
      input_path: inputPath,
      output_path: storagePath,
      meta: {
        trigger: input.capability,
        capability: input.capability,
        source_asset_id: sourceAssetId ?? null,
        ...input.extraMeta,
      },
      credits_reserved: creditCost,
    })
    .select("id")
    .single();

  if (jobError) {
    try {
      await refundReservedAssetJobCredits({
        created_by: gate.user.id,
        asset_id: assetId,
        credits_reserved: creditCost,
      });
    } catch {
      /* o asset vai ser apagado; o reembolso é idempotente no retry */
    }
    await gate.supabase.from("assets").delete().eq("id", assetId);
    if (isMissingRelationError(jobError)) {
      return { ok: false, error: SCHEMA_PENDING_MESSAGE };
    }
    return { ok: false, error: jobError.message };
  }

  revalidateAssetPages();
  return { ok: true, assetId, jobId: job?.id };
}

export async function cancelAssetJobAction(
  jobId: string,
): Promise<AssetActionResult> {
  const gate = await assertWorkspaceOwner();
  if (gate.error || !gate.user || !gate.workspaceId) {
    return { ok: false, error: gate.error ?? "Erro ao validar workspace" };
  }

  const { data: job, error } = await gate.supabase
    .from("asset_jobs")
    .select("id, workspace_id, status, created_by, asset_id, credits_reserved")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return { ok: false, error: SCHEMA_PENDING_MESSAGE };
    }
    return { ok: false, error: error.message };
  }
  if (!job || job.workspace_id !== gate.workspaceId) {
    return { ok: false, error: "Job não encontrado" };
  }
  if (job.status !== "queued") {
    return {
      ok: false,
      error: "Só é possível cancelar jobs na fila (queued).",
    };
  }

  const { error: updateError } = await gate.supabase
    .from("asset_jobs")
    .update({
      status: "cancelled",
      finished_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", jobId);

  if (updateError) return { ok: false, error: updateError.message };

  try {
    await refundReservedAssetJobCredits({
      created_by: job.created_by,
      asset_id: job.asset_id,
      credits_reserved: job.credits_reserved ?? 0,
    });
  } catch (err) {
    console.error(
      "[asset-job] reembolso no cancelamento falhou:",
      err instanceof Error ? err.message : err,
    );
  }

  revalidateAssetPages();
  return { ok: true };
}

export async function archiveAssetAction(
  assetId: string,
): Promise<AssetActionResult> {
  const gate = await assertWorkspaceOwner();
  if (gate.error || !gate.user || !gate.workspaceId) {
    return { ok: false, error: gate.error ?? "Erro ao validar workspace" };
  }

  const { data: asset, error } = await gate.supabase
    .from("assets")
    .select("id, workspace_id, kind")
    .eq("id", assetId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return { ok: false, error: SCHEMA_PENDING_MESSAGE };
    }
    return { ok: false, error: error.message };
  }
  if (!asset || asset.workspace_id !== gate.workspaceId) {
    return { ok: false, error: "Asset não encontrado" };
  }

  await gate.supabase
    .from("asset_jobs")
    .update({
      status: "cancelled",
      finished_at: new Date().toISOString(),
    })
    .eq("asset_id", assetId)
    .eq("status", "queued");

  const { error: updateError } = await gate.supabase
    .from("assets")
    .update({ status: "archived" })
    .eq("id", assetId);

  if (updateError) return { ok: false, error: updateError.message };

  await removeAssetDir(gate.workspaceId, asset.kind, assetId).catch(
    () => undefined,
  );

  revalidateAssetPages();
  return { ok: true, assetId };
}
