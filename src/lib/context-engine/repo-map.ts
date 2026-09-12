import { createHash } from "node:crypto";
import { listProjectTree, readProjectFile, type FileTreeNode } from "@/lib/projects/fs.server";
import { DEFAULT_CONTEXT_BUDGET, CONTEXT_EXCLUSIONS, CONTEXT_FILE_TYPE_MAP } from "@/lib/context-engine/config";
import type { RepoMap } from "@/lib/context-engine/types";

export type RepoMapInput = {
  projectId: string;
  projectName?: string;
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

function inferTypeFromPath(pathname: string): string {
  const raw = pathname.replace(/\\/g, "/").toLowerCase();
  const segments = raw.split("/");
  const last = segments.at(-1) ?? "";
  for (const [key, type] of Object.entries(CONTEXT_FILE_TYPE_MAP)) {
    if (segments.includes(key) || raw.includes(`/${key}/`) || raw.includes(`${key}/`)) {
      return type;
    }
  }
  if (/\.page\.|page\.[tj]sx?$/.test(last) || /\/pages\//.test(raw)) return "page";
  if (/\.(tsx|jsx)$/.test(last) && /\/components\//.test(raw)) return "component";
  if (/\.(tsx|jsx)$/.test(last) && /\/hooks\//.test(raw)) return "hook";
  if (/\.(tsx|jsx)$/.test(last) && /\/api\//.test(raw)) return "api";
  if (/\.(ts|tsx)$/.test(last) && /\b(schema|schemas)\b/.test(raw)) return "schema";
  if (/\.(ts|tsx)$/.test(last) && /\/types\//.test(raw)) return "types";
  if (/\.(ts|tsx)$/.test(last) && /\/lib\//.test(raw)) return "service";
  if (/\.(ts|tsx)$/.test(last) && /\/utils\//.test(raw)) return "util";
  if (/\.(json|css|md|sql)$/.test(last)) return "config";
  return "unknown";
}

function buildImportList(code: string): string[] {
  const imports = new Set<string>();
  const matches = code.matchAll(/(?:import|export)\s+(?:.*?\s+from\s+)?["']([^"']+)["']/g);
  for (const match of matches) {
    const spec = match[1]?.trim();
    if (!spec) continue;
    if (spec.startsWith(".") || spec.startsWith("/")) {
      imports.add(spec);
    } else {
      imports.add(spec);
    }
  }
  return [...imports].slice(0, 8);
}

export async function buildRepoMap({ projectId }: RepoMapInput): Promise<RepoMap> {
  try {
    const tree = await listProjectTree(projectId);
    const files = flattenFiles(tree);
    const repoFiles = [] as RepoMap["files"];
    const seen = new Set<string>();

    for (const filePath of files) {
      const rel = filePath.replace(/\\/g, "/");
      if (
        CONTEXT_EXCLUSIONS.some(
          (part) => rel.includes(`/${part}/`) || rel.startsWith(`${part}/`) || rel === part,
        )
      ) {
        continue;
      }
      if (seen.has(rel)) continue;
      seen.add(rel);

      let content = "";
      try {
        content = await readProjectFile(projectId, rel);
      } catch {
        content = "";
      }

      const type = inferTypeFromPath(rel) as RepoMap["files"][number]["type"];
      const imports = buildImportList(content).slice(0, 8);
      const sizeBytes = Buffer.byteLength(content, "utf8");
      const depth = rel.split("/").filter(Boolean).length;
      const contentHints = Array.from(
        new Set(
          content
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((token) => token.length > 2)
            .slice(0, 12),
        ),
      );

      repoFiles.push({
        path: rel,
        type,
        imports,
        sizeBytes,
        depth,
        reason: type === "page" ? "page" : type === "component" ? "component" : undefined,
        contentHints,
      });
    }

    const stats = {
      pages: repoFiles.filter((f) => f.type === "page").length,
      components: repoFiles.filter((f) => f.type === "component").length,
      services: repoFiles.filter((f) => f.type === "service").length,
      apis: repoFiles.filter((f) => f.type === "api").length,
      schemas: repoFiles.filter((f) => f.type === "schema").length,
      unknown: repoFiles.filter((f) => f.type === "unknown").length,
    };

    return {
      projectId,
      generatedAt: new Date().toISOString(),
      totalFiles: repoFiles.length,
      files: repoFiles,
      exclusions: CONTEXT_EXCLUSIONS,
      stats,
    };
  } catch {
    return {
      projectId,
      generatedAt: new Date().toISOString(),
      totalFiles: 0,
      files: [],
      exclusions: CONTEXT_EXCLUSIONS,
      stats: {
        pages: 0,
        components: 0,
        services: 0,
        apis: 0,
        schemas: 0,
        unknown: 0,
      },
    };
  }
}

export function repoMapFingerprint(repoMap: RepoMap): string {
  return createHash("sha1").update(JSON.stringify(repoMap)).digest("hex");
}

export function repoMapSummary(repoMap: RepoMap): string {
  return [
    `Arquivos mapeados: ${repoMap.totalFiles}`,
    `Páginas: ${repoMap.stats.pages}`,
    `Componentes: ${repoMap.stats.components}`,
    `Serviços: ${repoMap.stats.services}`,
    `APIs: ${repoMap.stats.apis}`,
    `Schemas: ${repoMap.stats.schemas}`,
  ].join("; ");
}

export function buildContextBudget(overrides?: Partial<typeof DEFAULT_CONTEXT_BUDGET>): typeof DEFAULT_CONTEXT_BUDGET {
  return { ...DEFAULT_CONTEXT_BUDGET, ...overrides };
}
