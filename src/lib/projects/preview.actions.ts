"use server";

import { createClient } from "@/lib/supabase/server";
import {
  listProjectTree,
  readProjectFile,
  type FileTreeNode,
} from "@/lib/projects/fs.server";
import { ensureProjectScaffold } from "@/lib/projects/scaffold.server";

const TEXT_EXT =
  /\.(tsx?|jsx?|css|json|html|md|svg|txt|mjs|cjs)$/i;

const SKIP_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "tsconfig.node.json",
  "vite.config.ts",
  "eslint.config.js",
  "README.md",
]);

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

/** Mapeia arquivos do disco (Vite src/*) para paths virtuais do Sandpack. */
export function toSandpackVirtualPath(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const base = normalized.split("/").pop() ?? "";
  if (SKIP_FILES.has(base)) return null;
  if (!TEXT_EXT.test(normalized)) return null;

  // Entrypoints do Vite não entram no Sandpack react-ts
  if (
    normalized === "src/main.tsx" ||
    normalized === "src/main.jsx" ||
    normalized === "index.html" ||
    normalized === "src/vite-env.d.ts"
  ) {
    return null;
  }

  if (normalized.startsWith("src/")) {
    return `/${normalized.slice(4)}`;
  }

  if (normalized === "package.json") return null;

  return `/${normalized}`;
}

export async function getProjectPreviewFiles(
  projectId: string,
): Promise<
  | { ok: true; files: Record<string, string>; updatedAt: string }
  | { ok: false; error: string }
> {
  const gate = await assertOwner(projectId);
  if (!gate.ok) return gate;

  try {
    await ensureProjectScaffold(projectId);
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
        // ignora arquivo ilegível
      }
    }

    // Stub de supabase para o preview não quebrar sem env
    if (!files["/lib/supabase.ts"] && !files["/lib/supabase.tsx"]) {
      files["/lib/supabase.ts"] = `export const supabase = {
  from() { return { select: async () => ({ data: [], error: null }), insert: async () => ({ data: null, error: null }) }; },
  auth: { getUser: async () => ({ data: { user: null }, error: null }) },
};
`;
    }

    return {
      ok: true,
      files,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao carregar preview",
    };
  }
}
