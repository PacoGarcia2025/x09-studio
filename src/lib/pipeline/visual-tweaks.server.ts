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
import type { LibraryBuildItem } from "@/lib/assets/project-library-catalog";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  HERO_GLB_COMPONENT,
  injectFullscreenHeroGlb,
  isGlbHeroMessage,
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

function pickHeroMesh(
  items: LibraryBuildItem[],
  diskNames: Set<string>,
): { publicPath: string } | null {
  const fromCatalog =
    items.find((item) => item.role === "mesh") ??
    items.find((item) => /\.(glb|gltf)$/i.test(item.publicPath));
  if (fromCatalog) return fromCatalog;
  const fromDisk = [...diskNames].find((name) => /\.(glb|gltf)$/i.test(name));
  return fromDisk ? { publicPath: `/library/${fromDisk}` } : null;
}

async function homePagePath(projectId: string): Promise<string | null> {
  if (await fileExists(projectId, "src/pages/HomePage.tsx")) {
    return "src/pages/HomePage.tsx";
  }
  if (await fileExists(projectId, "src/App.tsx")) return "src/App.tsx";
  return null;
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
  const glbHero = isGlbHeroMessage(input.message);

  let copied: LibraryBuildItem[] = [];
  try {
    copied = await syncWorkspaceLibraryIntoProject({
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
    copied = [];
  }

  const existing = await listLibraryFilenames(input.projectId);
  for (const item of copied) {
    const name = item.publicPath.replace(/^\/library\//, "");
    if (name) existing.add(name);
  }

  if (glbHero) {
    const mesh = pickHeroMesh(copied, existing);
    if (mesh) {
      await writeProjectFile(
        input.projectId,
        "src/components/HeroGlb.tsx",
        HERO_GLB_COMPONENT,
      );
      if (!paths.includes("src/components/HeroGlb.tsx")) {
        paths.push("src/components/HeroGlb.tsx");
      }
      const homePath = await homePagePath(input.projectId);
      if (homePath) {
        const raw = await readProjectFile(input.projectId, homePath);
        const next = injectFullscreenHeroGlb(
          raw,
          mesh.publicPath,
          homePath.startsWith("src/pages/"),
        );
        if (next !== raw) {
          await writeProjectFile(input.projectId, homePath, next);
          if (!paths.includes(homePath)) paths.push(homePath);
        }
      }
      notes.push(
        "O modelo 3D da galeria está no hero a ocupar o ecrã (podes girar com o olhar — o modelo roda sozinho).",
      );
    } else {
      notes.push(
        "Não encontrei um GLB na galeria. Envia ou gera o modelo em Biblioteca e pede de novo.",
      );
    }
  }

  if (isImageFixMessage(input.message) && !glbHero) {
    const stock = stockImagesForBrief(input.briefPrompt);
    const tree = await listProjectTree(input.projectId);
    for (const rel of flattenTextFiles(tree)) {
      if (!(await fileExists(input.projectId, rel))) continue;
      const raw = await readProjectFile(input.projectId, rel);
      const next = rewriteMissingLibrarySrcs(raw, existing, stock);
      if (next !== raw) {
        await writeProjectFile(input.projectId, rel, next);
        if (!paths.includes(rel)) paths.push(rel);
      }
    }
    if (existing.size > 0) {
      notes.push(
        "As fotos e o modelo da galeria ficam em /library/ — o preview e o site publicado passam a servi-los.",
      );
    } else if (paths.length > 0) {
      notes.push("Imagens em falta foram substituídas por fotos reais.");
    } else {
      notes.push(
        "Não encontrei ficheiros na galeria. Envia fotos ou um GLB em Biblioteca.",
      );
    }
  }

  if (isHeroWidenMessage(input.message) && !glbHero) {
    const homePath = await homePagePath(input.projectId);
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
