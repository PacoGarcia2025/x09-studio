"use server";

import { createClient } from "@/lib/supabase/server";
import {
  listProjectTree,
  readProjectFile,
  writeProjectFile,
  type FileTreeNode,
} from "@/lib/projects/fs.server";
import { ensureProjectScaffold } from "@/lib/projects/scaffold.server";

async function assertOwner(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };

  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { ok: false as const, error: "Projeto não encontrado" };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", project.workspace_id)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) {
    return { ok: false as const, error: "Sem permissão" };
  }

  return { ok: true as const };
}

export type FilesResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function getProjectFileTree(
  projectId: string,
): Promise<FilesResult<FileTreeNode[]>> {
  const gate = await assertOwner(projectId);
  if (!gate.ok) return gate;

  try {
    await ensureProjectScaffold(projectId);
    const tree = await listProjectTree(projectId);
    return { ok: true, data: tree };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao listar arquivos",
    };
  }
}

export async function readFileAction(
  projectId: string,
  relativePath: string,
): Promise<FilesResult<{ path: string; content: string }>> {
  const gate = await assertOwner(projectId);
  if (!gate.ok) return gate;

  try {
    await ensureProjectScaffold(projectId);
    const content = await readProjectFile(projectId, relativePath);
    return { ok: true, data: { path: relativePath, content } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao ler arquivo",
    };
  }
}

export async function writeFileAction(
  projectId: string,
  relativePath: string,
  content: string,
): Promise<FilesResult<{ path: string }>> {
  const gate = await assertOwner(projectId);
  if (!gate.ok) return gate;

  try {
    await ensureProjectScaffold(projectId);
    await writeProjectFile(projectId, relativePath, content);
    return { ok: true, data: { path: relativePath } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao salvar arquivo",
    };
  }
}
