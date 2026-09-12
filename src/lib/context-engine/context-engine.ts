import { resolveBlueprint, resolveBusinessDna, resolveExperienceDna } from "@/lib/dna";
import { buildRepoMap } from "@/lib/context-engine/repo-map";
import { selectRelevantFiles } from "@/lib/context-engine/file-selector";
import { assembleContextPackage } from "@/lib/context-engine/assembler";
import { ContextCache } from "@/lib/context-engine/cache";
import type { ContextPackage, ContextSelectionInput, RepoMap } from "@/lib/context-engine/types";

export const contextCache = new ContextCache<ContextPackage>("context-engine.v1");

export type ContextEngineOptions = ContextSelectionInput & {
  fallbackToLegacy?: boolean;
  projectId?: string | null;
  useCache?: boolean;
};

export async function buildContextEnginePackage(input: ContextEngineOptions): Promise<ContextPackage> {
  const prompt = input.request.trim();
  const businessDna = input.businessDna ?? resolveBusinessDna(prompt);
  const experienceDna = input.experienceDna ?? resolveExperienceDna(prompt);
  const blueprint = input.blueprint ?? resolveBlueprint(prompt, { hasExistingApp: Boolean(input.currentFiles && Object.keys(input.currentFiles).length > 0) });

  const projectId = input.projectId ?? "";
  const repoMap: RepoMap = input.repoMap ?? (projectId ? await buildRepoMap({ projectId }) : {
    projectId,
    generatedAt: new Date().toISOString(),
    totalFiles: 0,
    files: [],
    exclusions: [],
    stats: { pages: 0, components: 0, services: 0, apis: 0, schemas: 0, unknown: 0 },
  });

  const selectedFiles = selectRelevantFiles({
    ...input,
    businessDna,
    experienceDna,
    blueprint,
    repoMap,
  });

  const packageData = assembleContextPackage({
    ...input,
    businessDna,
    experienceDna,
    blueprint,
    repoMap,
    selectedFiles,
  });

  const cacheKey = [projectId, `${repoMap.totalFiles}`, `${selectedFiles.length}`];
  if (input.useCache !== false) {
    const cached = contextCache.get(projectId || null, cacheKey);
    if (cached) return cached;
    contextCache.set(projectId || null, packageData, cacheKey);
  }

  return packageData;
}

export async function unsafeLegacyContextFallback(input: ContextSelectionInput): Promise<ContextPackage> {
  const businessDna = input.businessDna ?? resolveBusinessDna(input.request);
  const experienceDna = input.experienceDna ?? resolveExperienceDna(input.request);
  const blueprint = input.blueprint ?? resolveBlueprint(input.request, { hasExistingApp: false });

  return assembleContextPackage({
    ...input,
    businessDna,
    experienceDna,
    blueprint,
    selectedFiles: (input.currentFiles ? Object.entries(input.currentFiles).slice(0, 12).map(([path, content]) => ({
      path,
      type: path.includes("page") ? "page" : path.includes("component") ? "component" : "unknown",
      reason: "fallback legado",
      score: 1,
      sizeBytes: Buffer.byteLength(content, "utf8"),
      imports: [],
      dependencyDepth: 1,
    })) : []),
  });
}
