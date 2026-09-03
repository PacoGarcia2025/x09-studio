import "server-only";

import fs from "node:fs/promises";
import {
  fileExists,
  listProjectTree,
  readProjectFile,
  resolveInsideProject,
  writeProjectFile,
  type FileTreeNode,
} from "@/lib/projects/fs.server";
import { syncWorkspaceLibraryIntoProject } from "@/lib/assets/project-library";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isHeroWidenMessage,
  isImageFixMessage,
  rewriteMissingLibrarySrcs,
  stockImagesForBrief,
  widenHeroCopy,
} from "@/lib/pipeline/visual-tweaks";

function flattenTextFiles(nodes: FileTreeNode[], out: string[] = []): string[] {
  for (const node of nodes) {
    if (node.type === "directory" && node.children) {
      flattenTextFiles(node.children, out);
    } else if (node.type === "file" && /\.(tsx?|jsx?)$/i.test(node.path)) {
      out.push(node.path);
    }
  }
  return out;
}

async function listLibraryFilenames(projectId: string): Promise<Set<string>> {
  try {
    const dir = resolveInsideProject(projectId, "public/library");
    const names = await fs.readdir(dir);
    return new Set(names.filter((name) => !name.startsWith(".")));
  } catch {
    return new Set();
  }
}

export async function applyDeterministicVisualFixes(input: {
  projectId: string;
  workspaceId: string;
  supabase: SupabaseClient;
  message: string;
  briefPrompt?: string | null;
}): Promise<{ applied: boolean; summary: string; paths: string[] }> {
  const paths: string[] = [];
  const notes: string[] = [];

  if (isImageFixMessage(input.message)) {
    try {
      const copied = await syncWorkspaceLibraryIntoProject({
        projectId: input.projectId,
        workspaceId: input.workspaceId,
        supabase: input.supabase,
      });
      if (copied.length > 0) {
        notes.push(
          `Galeria ligada (${copied.length} ficheiro${copied.length === 1 ? "" : "s"}).`,
        );
      }
    } catch {
      // segue para fallback stock
    }

    const existing = await listLibraryFilenames(input.projectId);
    const stock = stockImagesForBrief(input.briefPrompt);
    const tree = await listProjectTree(input.projectId);
    for (const rel of flattenTextFiles(tree)) {
      if (!(await fileExists(input.projectId, rel))) continue;
      const raw = await readProjectFile(input.projectId, rel);
      const next = rewriteMissingLibrarySrcs(raw, existing, stock);
      if (next !== raw) {
        await writeProjectFile(input.projectId, rel, next);
        paths.push(rel);
      }
    }
    if (paths.length > 0) {
      notes.push("Imagens em falta foram substituídas por fotos reais.");
    } else if (existing.size > 0) {
      notes.push("Fotos da galeria já estão no projeto — o preview e o site publicado passam a usá-las.");
    } else {
      notes.push("Não encontrei ficheiros na galeria; usei fotos de stock para não deixar a página vazia.");
    }
  }

  if (isHeroWidenMessage(input.message)) {
    const homePath = (await fileExists(input.projectId, "src/pages/HomePage.tsx"))
      ? "src/pages/HomePage.tsx"
      : (await fileExists(input.projectId, "src/App.tsx"))
        ? "src/App.tsx"
        : null;
    if (homePath) {
      const raw = await readProjectFile(input.projectId, homePath);
      const next = widenHeroCopy(raw);
      if (next !== raw) {
        await writeProjectFile(input.projectId, homePath, next);
        if (!paths.includes(homePath)) paths.push(homePath);
        notes.push("O texto do hero agora pode ocupar mais largura.");
      }
    }
  }

  if (paths.length === 0 && notes.length === 0) {
    return { applied: false, summary: "", paths: [] };
  }

  return {
    applied: true,
    summary: notes.join(" ") || "Ajustes visuais aplicados.",
    paths,
  };
}
