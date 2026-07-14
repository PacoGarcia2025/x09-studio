import fs from "node:fs/promises";
import path from "node:path";
import type { FileTreeNode } from "@/lib/projects/file-tree";
import { getProjectDir } from "@/lib/projects/paths";

export type { FileTreeNode } from "@/lib/projects/file-tree";

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  ".turbo",
]);

function assertSafeRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) {
    throw new Error("Caminho inválido");
  }
  if (normalized.split("/").some((p) => p === "..")) {
    throw new Error("Path traversal bloqueado");
  }
  return normalized;
}

export function resolveInsideProject(
  projectId: string,
  relativePath = ".",
): string {
  const root = getProjectDir(projectId);
  const safe =
    relativePath === "." || relativePath === ""
      ? "."
      : assertSafeRelativePath(relativePath);
  const absolute = path.resolve(root, safe);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path fora do projeto");
  }
  return absolute;
}

export async function projectDirExists(projectId: string): Promise<boolean> {
  try {
    const st = await fs.stat(getProjectDir(projectId));
    return st.isDirectory();
  } catch {
    return false;
  }
}

async function walkDir(
  absoluteDir: string,
  relativeDir: string,
): Promise<FileTreeNode[]> {
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const nodes: FileTreeNode[] = [];

  for (const entry of entries) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    if (entry.name === ".DS_Store") continue;

    const rel = relativeDir
      ? `${relativeDir}/${entry.name}`.replace(/\\/g, "/")
      : entry.name;

    if (entry.isDirectory()) {
      const children = await walkDir(path.join(absoluteDir, entry.name), rel);
      nodes.push({
        name: entry.name,
        path: rel,
        type: "directory",
        children,
      });
    } else if (entry.isFile()) {
      nodes.push({ name: entry.name, path: rel, type: "file" });
    }
  }

  return nodes;
}

export async function listProjectTree(
  projectId: string,
): Promise<FileTreeNode[]> {
  const root = resolveInsideProject(projectId, ".");
  return walkDir(root, "");
}

const MAX_READ_BYTES = 512_000;

export async function readProjectFile(
  projectId: string,
  relativePath: string,
): Promise<string> {
  const absolute = resolveInsideProject(projectId, relativePath);
  const st = await fs.stat(absolute);
  if (!st.isFile()) {
    throw new Error("Não é um arquivo");
  }
  if (st.size > MAX_READ_BYTES) {
    throw new Error("Arquivo muito grande para o editor (máx. 500KB)");
  }
  return fs.readFile(absolute, "utf8");
}

export async function writeProjectFile(
  projectId: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const absolute = resolveInsideProject(projectId, relativePath);
  const st = await fs.stat(absolute).catch(() => null);
  if (st && !st.isFile()) {
    throw new Error("Caminho não é um arquivo");
  }
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, content, "utf8");
}

export async function deleteProjectFile(
  projectId: string,
  relativePath: string,
): Promise<void> {
  const absolute = resolveInsideProject(projectId, relativePath);
  const st = await fs.stat(absolute).catch(() => null);
  if (!st) return;
  if (!st.isFile()) {
    throw new Error("Só é permitido excluir arquivos");
  }
  await fs.unlink(absolute);
}

export async function fileExists(
  projectId: string,
  relativePath: string,
): Promise<boolean> {
  try {
    const st = await fs.stat(resolveInsideProject(projectId, relativePath));
    return st.isFile();
  } catch {
    return false;
  }
}
