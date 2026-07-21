import "server-only";

import path from "node:path";
import {
  listProjectTree,
  readProjectFile,
  type FileTreeNode,
} from "@/lib/projects/fs.server";

export type BrokenImport = {
  file: string;
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
