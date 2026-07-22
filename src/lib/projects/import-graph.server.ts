import "server-only";

import path from "node:path";
import {
  listProjectTree,
  readProjectFile,
  type FileTreeNode,
} from "@/lib/projects/fs.server";
import { SANDPACK_ALLOWED_PACKAGES } from "@/lib/projects/sandpack-setup";

export type BrokenImport = {
  file: string;
  spec: string;
};

export type DisallowedNpmImport = {
  file: string;
  package: string;
  spec: string;
};

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

function resolveRelativeImport(
  fromFile: string,
  spec: string,
  fileSet: Set<string>,
): boolean {
  const dir = path.posix.dirname(fromFile.replace(/\\/g, "/"));
  const base = path.posix.normalize(path.posix.join(dir, spec));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mts`,
    `${base}.cts`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
  ];
  return candidates.some((c) => fileSet.has(c));
}

/** Detecta imports relativos quebrados no projeto (mesma lógica do Verify). */
export async function findBrokenImports(
  projectId: string,
): Promise<BrokenImport[]> {
  const tree = await listProjectTree(projectId);
  const files = flattenFiles(tree).filter((f) =>
    /\.(tsx?|jsx?|mts|cts)$/.test(f),
  );
  const fileSet = new Set(files.map((f) => f.replace(/\\/g, "/")));
  const broken: BrokenImport[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = await readProjectFile(projectId, file);
    } catch {
      continue;
    }
    const importRe = /(?:from\s+|import\s*\()\s*["'](\.[^"']+)["']/g;
    let im: RegExpExecArray | null;
    while ((im = importRe.exec(content)) !== null) {
      const spec = im[1]!;
      if (spec.includes("?")) continue;
      if (!resolveRelativeImport(file, spec, fileSet)) {
        broken.push({ file, spec });
      }
    }
  }

  return broken;
}

export function formatBrokenImportMessage(broken: BrokenImport[]): string {
  if (broken.length === 0) return "";
  const first = broken[0]!;
  const extra =
    broken.length > 1 ? ` (+${broken.length - 1} import(s) quebrado(s))` : "";
  return `Import quebrado: "${first.spec}" em ${first.file}${extra}`;
}

function npmPackageName(spec: string): string {
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
  }
  return spec.split("/")[0] ?? spec;
}

/** Imports de pacotes NPM fora da allowlist do Sandpack (quebram o preview). */
export async function findDisallowedNpmImports(
  projectId: string,
): Promise<DisallowedNpmImport[]> {
  const tree = await listProjectTree(projectId);
  const files = flattenFiles(tree).filter((f) =>
    /\.(tsx?|jsx?|mts|cts)$/.test(f),
  );
  const disallowed: DisallowedNpmImport[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = await readProjectFile(projectId, file);
    } catch {
      continue;
    }

    const importRe =
      /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
    let im: RegExpExecArray | null;
    while ((im = importRe.exec(content)) !== null) {
      const spec = im[1]!;
      if (spec.startsWith(".") || spec.startsWith("/")) continue;
      if (spec.startsWith("@/")) continue;
      const pkg = npmPackageName(spec);
      if (SANDPACK_ALLOWED_PACKAGES.has(pkg)) continue;
      disallowed.push({ file, package: pkg, spec });
    }
  }

  return disallowed;
}

export function formatDisallowedNpmMessage(
  list: DisallowedNpmImport[],
): string {
  if (list.length === 0) return "";
  const first = list[0]!;
  const extra =
    list.length > 1 ? ` (+${list.length - 1} pacote(s) não suportado(s))` : "";
  return `Pacote "${first.package}" não disponível no preview (Sandpack) em ${first.file}${extra}. Use lucide-react, framer-motion ou CSS nativo.`;
}
