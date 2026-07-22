import "server-only";

import path from "node:path";
import {
  listProjectTree,
  readProjectFile,
  writeProjectFile,
  type FileTreeNode,
} from "@/lib/projects/fs.server";
import { getProjectDir } from "@/lib/projects/paths";
import { STUDIO_RUNTIME_DEPENDENCIES } from "@/lib/projects/runtime-deps";

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

function npmPackageName(spec: string): string {
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
  }
  return spec.split("/")[0] ?? spec;
}

/** Pacotes NPM importados no código-fonte do projeto. */
export async function collectUsedNpmPackages(
  projectId: string,
): Promise<Set<string>> {
  const tree = await listProjectTree(projectId);
  const files = flattenFiles(tree).filter((f) =>
    /\.(tsx?|jsx?|mts|cts)$/.test(f),
  );
  const used = new Set<string>();

  for (const file of files) {
    let content: string;
    try {
      content = await readProjectFile(projectId, file);
    } catch {
      continue;
    }
    const importRe = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
    let im: RegExpExecArray | null;
    while ((im = importRe.exec(content)) !== null) {
      const spec = im[1]!;
      if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("@/")) {
        continue;
      }
      used.add(npmPackageName(spec));
    }
  }

  return used;
}

/**
 * Garante package.json com deps usadas no código (framer-motion, lucide, etc.).
 */
export async function ensureProjectDependencies(
  projectId: string,
): Promise<string[]> {
  const used = await collectUsedNpmPackages(projectId);
  const pkgRel = "package.json";
  let pkgRaw: string;
  try {
    pkgRaw = await readProjectFile(projectId, pkgRel);
  } catch {
    return [];
  }

  const pkg = JSON.parse(pkgRaw) as {
    dependencies?: Record<string, string>;
  };
  const deps = { ...(pkg.dependencies ?? {}) };
  const added: string[] = [];

  for (const [name, version] of Object.entries(STUDIO_RUNTIME_DEPENDENCIES)) {
    if (!used.has(name)) continue;
    if (deps[name]) continue;
    deps[name] = version;
    added.push(name);
  }

  if (added.length === 0) return [];

  pkg.dependencies = deps;
  await writeProjectFile(projectId, pkgRel, `${JSON.stringify(pkg, null, 2)}\n`);

  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(path.join(getProjectDir(projectId), "package-lock.json"));
  } catch {
    // lock será regenerado no npm ci
  }

  return added;
}
