import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AssetJobRow } from "@/lib/ai-engine/types";

type GateError = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string } | null;
  workspaceId: string | null;
  job: AssetJobRow | null;
  error: string;
};

type GateOk = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string };
  workspaceId: string;
  job: AssetJobRow | null;
  error: null;
};

export type AssetOwnershipGate = GateOk | GateError;

async function loadOwnedWorkspace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workspaceId?: string,
) {
  let query = supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (workspaceId) {
    query = supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .eq("owner_id", userId)
      .limit(1);
  }

  const { data } = await query.maybeSingle();
  return data?.id ?? null;
}

/** Workspace do usuário autenticado (MVP: um workspace por owner). */
export async function assertWorkspaceOwner(
  workspaceId?: string,
): Promise<AssetOwnershipGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      workspaceId: null,
      job: null,
      error: "Não autenticado",
    };
  }

  const ownedId = await loadOwnedWorkspace(supabase, user.id, workspaceId);
  if (!ownedId) {
    return {
      supabase,
      user,
      workspaceId: null,
      job: null,
      error: "Sem permissão",
    };
  }

  return {
    supabase,
    user,
    workspaceId: ownedId,
    job: null,
    error: null,
  };
}

export async function assertProjectInWorkspace(
  projectId: string,
  workspaceId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { ok: false, error: "Projeto não encontrado" };
  if (project.workspace_id !== workspaceId) {
    return { ok: false, error: "Sem permissão" };
  }
  return { ok: true };
}

export async function assertAssetJobOwner(
  jobId: string,
): Promise<AssetOwnershipGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      workspaceId: null,
      job: null,
      error: "Não autenticado",
    };
  }

  const { data: job } = await supabase
    .from("asset_jobs")
    .select(
      "id, workspace_id, project_id, asset_id, created_by, kind, operation, provider_id, status, input_path, output_path, error_message, meta, credits_reserved, started_at, finished_at, created_at, updated_at",
    )
    .eq("id", jobId)
    .maybeSingle();

  if (!job) {
    return {
      supabase,
      user,
      workspaceId: null,
      job: null,
      error: "Job não encontrado",
    };
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", job.workspace_id)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) {
    return {
      supabase,
      user,
      workspaceId: null,
      job: null,
      error: "Sem permissão",
    };
  }

  return {
    supabase,
    user,
    workspaceId: job.workspace_id,
    job: job as AssetJobRow,
    error: null,
  };
}
