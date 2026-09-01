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
import { getExecutionPolicies } from "@/lib/capability-router/policies";
import { resolveCapability } from "@/lib/capability-router/resolve";

const ASSET_SELECT =
  "id, workspace_id, project_id, created_by, kind, source, status, original_name, storage_path, mime_type, byte_size, meta, created_at, updated_at";

const JOB_SELECT = ASSET_JOB_SELECT;

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
  const gate = await assertWorkspaceOwner();
  if (gate.error || !gate.user || !gate.workspaceId) {
    return { ok: false, error: gate.error ?? "Erro ao validar workspace" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo." };
  }
  if (!isAllowedByteSize(file.size)) {
    return { ok: false, error: "Arquivo acima do limite (24 MB)." };
  }

  const classified = classifyUpload(
    file.name,
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
      revalidatePath("/assets");
      return { ok: false, error: SCHEMA_PENDING_MESSAGE };
    }
    return { ok: false, error: jobError.message };
  }

  revalidatePath("/assets");
  return { ok: true, assetId, jobId: job?.id };
}

/**
 * Enfileira mesh.generate. Não conhece o provider — só a capability.
 * O Router escolhe o provider no tick (hoje o stub; depois um motor real).
 */
export async function enqueueMeshGenerateAction(
  sourceAssetId?: string,
): Promise<AssetActionResult> {
  const gate = await assertWorkspaceOwner();
  if (gate.error || !gate.user || !gate.workspaceId) {
    return { ok: false, error: gate.error ?? "Erro ao validar workspace" };
  }

  const resolved = resolveCapability("mesh.generate", getExecutionPolicies());
  if (!resolved.ok) {
    return { ok: false, error: resolved.reason };
  }

  let projectId: string | null = null;
  let inputPath: string | null = null;
  let sourceName = "exemplo";

  if (sourceAssetId) {
    const { data: source, error } = await gate.supabase
      .from("assets")
      .select(
        "id, workspace_id, project_id, kind, original_name, storage_path, status",
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
    if (source.kind !== "image") {
      return { ok: false, error: "mesh.generate a partir de um asset espera uma imagem." };
    }
    projectId = source.project_id;
    inputPath = source.storage_path;
    sourceName = source.original_name.replace(/\.[^.]+$/, "") || "exemplo";
  }

  const assetId = randomUUID();
  const storagePath = buildAssetRelativeFile(
    gate.workspaceId,
    "mesh",
    assetId,
    "glb",
  );
  const originalName = `${sourceName}-exemplo.glb`;

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
      capability: "mesh.generate",
      source_asset_id: sourceAssetId ?? null,
    },
  });

  if (insertError) {
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
      kind: "mesh",
      operation: "generate",
      provider_id: "local",
      status: "queued",
      input_path: inputPath,
      output_path: storagePath,
      meta: {
        trigger: "mesh.generate",
        capability: "mesh.generate",
        source_asset_id: sourceAssetId ?? null,
      },
      credits_reserved: 0,
    })
    .select("id")
    .single();

  if (jobError) {
    await gate.supabase.from("assets").delete().eq("id", assetId);
    if (isMissingRelationError(jobError)) {
      return { ok: false, error: SCHEMA_PENDING_MESSAGE };
    }
    return { ok: false, error: jobError.message };
  }

  revalidatePath("/assets");
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
    .select("id, workspace_id, status")
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

  revalidatePath("/assets");
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

  revalidatePath("/assets");
  return { ok: true, assetId };
}
