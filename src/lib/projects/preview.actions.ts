"use server";

import { createClient } from "@/lib/supabase/server";
import {
  listProjectTree,
  projectDirExists,
  readProjectFile,
  type FileTreeNode,
} from "@/lib/projects/fs.server";
import { ensureProjectScaffold } from "@/lib/projects/scaffold.server";
import {
  findBrokenImports,
  formatBrokenImportMessage,
  repairProjectSourceIssues,
} from "@/lib/projects/import-graph.server";
import { toSandpackVirtualPath, parseDotEnv, patchSupabaseEnvInCode, prepareSandpackFileContent } from "@/lib/projects/preview-map";

async function assertOwner(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };

  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id, status, brief_prompt")
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

function flattenFiles(nodes: FileTreeNode[], out: string[] = []): string[] {
  for (const node of nodes) {
    if (node.type === "directory" && node.children) {
      flattenFiles(node.children, out);
    } else if (node.type === "file") {
      out.push(node.path);
    }
  }
  return out;
}

export async function getProjectPreviewFiles(
  projectId: string,
): Promise<
  | { ok: true; files: Record<string, string>; updatedAt: string }
  | { ok: false; error: string; generating?: boolean }
> {
  const gate = await assertOwner(projectId);
  if (!gate.ok) return gate;

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("status, brief_prompt")
    .eq("id", projectId)
    .maybeSingle();

  const briefPrompt = project?.brief_prompt ?? null;
  const projectStatus = project?.status ?? "draft";

  try {
    if (!(await projectDirExists(projectId))) {
      await ensureProjectScaffold(projectId, { briefPrompt });
    } else if (briefPrompt) {
      await ensureProjectScaffold(projectId, { briefPrompt });
    }

    await repairProjectSourceIssues(projectId);

    const broken = await findBrokenImports(projectId);
    if (broken.length > 0) {
      if (projectStatus === "generating") {
        return {
          ok: false,
          error:
            "A IA ainda está gerando o app. Aguarde a conclusão ou volte e clique em «Continuar build».",
          generating: true,
        };
      }
      return {
        ok: false,
        error: `${formatBrokenImportMessage(broken)}. Abra o Builder e clique em «Continuar build» ou regenere o projeto.`,
      };
    }
    const tree = await listProjectTree(projectId);
    const paths = flattenFiles(tree);
    const files: Record<string, string> = {};

    for (const rel of paths) {
      const virtual = toSandpackVirtualPath(rel);
      if (!virtual) continue;
      try {
        const content = await readProjectFile(projectId, rel);
        files[virtual] = content;
      } catch {
        // ignora
      }
    }

    if (!files["/lib/supabase.ts"] && !files["/lib/supabase.tsx"]) {
      files["/lib/supabase.ts"] = `export const supabase = {
  from() { return { select: async () => ({ data: [], error: null }), insert: async () => ({ data: null, error: null }) }; },
  auth: { getUser: async () => ({ data: { user: null }, error: null }) },
};
`;
    }

    const env: Record<string, string> = {};
    for (const rel of [".env.local", ".env"]) {
      try {
        Object.assign(env, parseDotEnv(await readProjectFile(projectId, rel)));
      } catch {
        // ignore
      }
    }

    const prepared: Record<string, string> = {};
    for (const [path, code] of Object.entries(files)) {
      if (path === "/lib/supabase.ts" || path === "/lib/supabase.tsx") {
        prepared[path] = patchSupabaseEnvInCode(code, env);
      } else {
        prepared[path] = prepareSandpackFileContent(path, code);
      }
    }

    return {
      ok: true,
      files: prepared,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao carregar preview",
    };
  }
}
