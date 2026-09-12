export { buildContextEnginePackage, unsafeLegacyContextFallback, contextCache } from "@/lib/context-engine/context-engine";
export { buildRepoMap, repoMapSummary, repoMapFingerprint } from "@/lib/context-engine/repo-map";
export { selectRelevantFiles, selectFilesForRequest, estimateContextTokens } from "@/lib/context-engine/file-selector";
export { assembleContextPackage } from "@/lib/context-engine/assembler";
export { ContextCache, computeFileHash, shouldInvalidateContext } from "@/lib/context-engine/cache";
export type { ContextPackage, RepoMap, SelectedContextFile } from "@/lib/context-engine/types";
