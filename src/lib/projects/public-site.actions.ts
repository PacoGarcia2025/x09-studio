"use server";

import {
  listProjectTree,
  readProjectFile,
  type FileTreeNode,
} from "@/lib/projects/fs.server";
import { toSandpackVirtualPath } from "@/lib/projects/preview-map";
import { createAdminClient } from "@/lib/supabase/admin";

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

/**
 * Carrega arquivos de um projeto publicado (público, por slug).
 * Usa admin client para bypass RLS — só libera status ready/published.
 */
export async function getPublishedSiteFiles(slug: string): Promise<
  | {
      ok: true;
      project: { id: string; name: string; slug: string };
      files: Record<string, string>;
    }
  | { ok: false; error: string }
> {
  const safeSlug = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(safeSlug)) {
    return { ok: false, error: "Slug inválido" };
  }

  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, slug, status")
    .eq("slug", safeSlug)
    .maybeSingle();

  if (!project) return { ok: false, error: "Site não encontrado" };

  if (project.status !== "published" && project.status !== "ready") {
    return {
      ok: false,
      error: "Publique o app no Studio (botão Publicar) para liberar o link",
    };
  }

  try {
    const tree = await listProjectTree(project.id);
    const paths = flattenFiles(tree);
    const files: Record<string, string> = {};

    for (const rel of paths) {
      const virtual = toSandpackVirtualPath(rel);
      if (!virtual) continue;
      try {
        files[virtual] = await readProjectFile(project.id, rel);
      } catch {
        // skip
      }
    }

    if (!files["/lib/supabase.ts"] && !files["/lib/supabase.tsx"]) {
      files["/lib/supabase.ts"] = `export const supabase = {
  from() { return { select: async () => ({ data: [], error: null }), insert: async () => ({ data: null, error: null }) }; },
  auth: {
    signInWithPassword: async () => ({ data: { user: { id: "demo" } }, error: null }),
    signUp: async () => ({ data: { user: { id: "demo" } }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
  },
};
`;
    }

    return {
      ok: true,
      project: { id: project.id, name: project.name, slug: project.slug },
      files,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao carregar site",
    };
  }
}
