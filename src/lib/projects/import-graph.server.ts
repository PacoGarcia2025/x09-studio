import "server-only";

import path from "node:path";
import {
  listProjectTree,
  readProjectFile,
  writeProjectFile,
  type FileTreeNode,
} from "@/lib/projects/fs.server";
import {
  findUndeclaredJsxInSource,
  formatUndeclaredJsxMessage,
  repairKnownRuntimeImportsInSource,
  type UndeclaredJsxIdentifier,
} from "@/lib/projects/jsx-scope";
import {
  findUnrepairableLucideImportsInSource,
  formatInvalidLucideMessage,
  repairInvalidLucideImportsInSource,
  type InvalidLucideImport,
} from "@/lib/projects/lucide-validate";
import { stripForbiddenPreviewImports } from "@/lib/projects/preview-map";
import { SANDPACK_ALLOWED_PACKAGES } from "@/lib/projects/sandpack-setup";

export type { UndeclaredJsxIdentifier, InvalidLucideImport };
export { formatUndeclaredJsxMessage, formatInvalidLucideMessage };

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

function listSourceFiles(nodes: FileTreeNode[]): string[] {
  return flattenFiles(nodes).filter((f) => /\.(tsx?|jsx?|mts|cts)$/.test(f));
}

/** JSX com identificadores não importados (ReferenceError em runtime). */
export async function findUndeclaredJsxIdentifiers(
  projectId: string,
): Promise<UndeclaredJsxIdentifier[]> {
  const tree = await listProjectTree(projectId);
  const files = listSourceFiles(tree);
  const undeclared: UndeclaredJsxIdentifier[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = await readProjectFile(projectId, file);
    } catch {
      continue;
    }
    undeclared.push(...findUndeclaredJsxInSource(content, file));
  }

  return undeclared;
}

/** Imports de lucide-react com nomes inexistentes (quebram vite build). */
export async function findInvalidLucideImports(
  projectId: string,
): Promise<InvalidLucideImport[]> {
  const tree = await listProjectTree(projectId);
  const files = listSourceFiles(tree).filter((f) => /\.tsx?$/i.test(f));
  const invalid: InvalidLucideImport[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = await readProjectFile(projectId, file);
    } catch {
      continue;
    }
    invalid.push(...findUnrepairableLucideImportsInSource(content, file));
  }

  return invalid;
}

function repairSourceFileContent(content: string): string {
  return repairKnownRuntimeImportsInSource(
    repairInvalidLucideImportsInSource(stripForbiddenPreviewImports(content)),
  );
}

function resolveImportTargetPath(fromFile: string, spec: string): string {
  const dir = path.posix.dirname(fromFile.replace(/\\/g, "/"));
  const base = path.posix.normalize(path.posix.join(dir, spec));
  if (base.endsWith(".ts") || base.endsWith(".tsx")) return base;
  return `${base}.ts`;
}

function collectNamedImportsFromSpec(
  content: string,
  spec: string,
): { defaultImport?: string; named: string[] } {
  const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const defaultRe = new RegExp(
    `import\\s+([A-Za-z_$][\\w$]*)\\s+from\\s+["']${escaped}["']`,
  );
  const namedRe = new RegExp(
    `import\\s+(?:type\\s+)?\\{([^}]+)\\}\\s+from\\s+["']${escaped}["']`,
  );
  const defaultImport = content.match(defaultRe)?.[1];
  const namedBlock = content.match(namedRe)?.[1];
  const named =
    namedBlock
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const asMatch = part.match(
          /(?:type\s+)?([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)/,
        );
        if (asMatch) return asMatch[2]!;
        return part.replace(/^type\s+/, "").trim().split(/\s+/)[0]!;
      })
      .filter(Boolean) ?? [];

  return { defaultImport, named };
}

function stubModuleSource(
  modulePath: string,
  imports: { defaultImport?: string; named: string[] },
): string {
  const base = path.posix.basename(modulePath, path.posix.extname(modulePath));
  const lines: string[] = [
    "// Auto-gerado pelo X09 Studio para destravar preview/build.",
  ];

  for (const name of [...new Set(imports.named)]) {
    lines.push(
      `export function ${name}(...args: unknown[]) { return args[0] ?? null; }`,
    );
  }

  if (imports.defaultImport) {
    lines.push(`export default function ${imports.defaultImport}(...args: unknown[]) {
  return args[0] ?? null;
}`);
  } else if (base === "jsonld") {
    lines.push(`export function buildJsonLd(data: Record<string, unknown>) {
  return data;
}`);
    lines.push("export default buildJsonLd;");
  } else {
    lines.push("export default {};");
  }

  return `${lines.join("\n")}\n`;
}

/** Cria stubs mínimos para imports relativos quebrados (ex.: ../lib/jsonld). */
export async function repairBrokenRelativeImports(
  projectId: string,
): Promise<string[]> {
  const tree = await listProjectTree(projectId);
  const files = listSourceFiles(tree);
  const fileSet = new Set(files.map((f) => f.replace(/\\/g, "/")));
  const broken = await findBrokenImports(projectId);
  const changed: string[] = [];

  for (const { file, spec } of broken) {
    const target = resolveImportTargetPath(file, spec);
    if (fileSet.has(target) || fileSet.has(target.replace(/\.ts$/, ".tsx"))) {
      continue;
    }

    let content = "";
    try {
      content = await readProjectFile(projectId, file);
    } catch {
      continue;
    }

    const imports = collectNamedImportsFromSpec(content, spec);
    await writeProjectFile(
      projectId,
      target,
      stubModuleSource(target, imports),
    );
    fileSet.add(target);
    changed.push(target);
  }

  return changed;
}

/**
 * Corrige imports JSX faltantes e ícones lucide inválidos em arquivos TSX.
 * Retorna paths alterados.
 */
export async function repairProjectSourceIssues(
  projectId: string,
): Promise<string[]> {
  await repairBrokenRelativeImports(projectId);

  const tree = await listProjectTree(projectId);
  const files = listSourceFiles(tree).filter((f) => /\.tsx$/i.test(f));
  const changed: string[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = await readProjectFile(projectId, file);
    } catch {
      continue;
    }
    const repaired = repairSourceFileContent(content);
    if (repaired === content) continue;
    await writeProjectFile(projectId, file, repaired);
    changed.push(file);
  }

  return changed;
}

/** @deprecated use repairProjectSourceIssues */
export async function repairUndeclaredJsxImports(
  projectId: string,
): Promise<string[]> {
  return repairProjectSourceIssues(projectId);
}
