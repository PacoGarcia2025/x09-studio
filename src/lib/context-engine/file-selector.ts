import type { ContextSelectionInput, RepoMap, SelectedContextFile } from "@/lib/context-engine/types";
import { DEFAULT_CONTEXT_BUDGET } from "@/lib/context-engine/config";

const TERM_SYNONYMS: Record<string, string[]> = {
  cliente: ["cliente", "clientes", "customer", "customers", "client", "clients", "user", "users", "lead", "leads"],
  telefone: ["telefone", "phone", "phones", "mobile", "tel", "celular", "contact"],
  cadastro: ["cadastro", "register", "registro", "signup", "form", "forms"],
  dashboard: ["dashboard", "overview", "painel", "panel"],
  preco: ["preco", "precos", "price", "pricing", "plan", "plans", "subscription", "billing"],
  landing: ["landing", "home", "hero", "cta", "banner", "call_to_action"],
  page: ["page", "screen", "view"],
  api: ["api", "route", "endpoint", "server"],
};

function normalize(input: string): string {
  return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toTermSet(input: string): Set<string> {
  const raw = normalize(input)
    .replace(/[_/.-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ");

  const tokens = raw
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length > 2);

  const expanded = new Set<string>();
  for (const token of tokens) {
    expanded.add(token);
    for (const [canonical, aliases] of Object.entries(TERM_SYNONYMS)) {
      if (token === canonical || aliases.includes(token)) {
        expanded.add(canonical);
        for (const alias of aliases) expanded.add(alias);
      }
    }
  }
  return expanded;
}

function isBinaryLike(filePath: string): boolean {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico|pdf|zip|mp4|mov|mp3|wav|glb|obj|woff2?|ttf|eot|bin)$/i.test(filePath);
}

function isDocumentationLike(filePath: string): boolean {
  return /\.(md|mdx|txt|csv|json|sql)$/i.test(filePath) && !/\.(ts|tsx|js|jsx|css)$/i.test(filePath);
}

function scoreCandidate(
  file: RepoMap["files"][number],
  request: string,
  blueprint?: unknown,
  recentFiles: string[] = [],
  repairIssues: Array<{ file?: string; message: string; severity?: "error" | "warning" }> = [],
): { score: number; reason: string } {
  const pathText = normalize(file.path);
  const requestTerms = toTermSet(request);
  const fileSegments = pathText.split(/[\/._-]+/).filter(Boolean);
  const reasonParts = new Set<string>();
  let score = 0;

  let directTermMatches = 0;
  const hasRecentOrRepairSignal = recentFiles.includes(file.path) || repairIssues.some((issue) => issue.file && normalize(issue.file).includes(pathText));

  for (const term of requestTerms) {
    const matchesPath = fileSegments.some((segment) => segment.includes(term));
    const matchesImport = file.imports.some((imp) => normalize(imp).includes(term));
    const matchesHint = (file.contentHints ?? []).some((hint) => normalize(hint).includes(term));
    const hit = matchesPath || matchesImport || matchesHint;

    if (!hit) continue;

    directTermMatches += 1;
    if (matchesPath) {
      score += 18;
      reasonParts.add("path");
    }
    if (matchesImport) {
      score += 10;
      reasonParts.add("import");
    }
    if (matchesHint) {
      score += 12;
      reasonParts.add("content");
    }
  }

  if (directTermMatches === 0 && !hasRecentOrRepairSignal && !blueprint) {
    return { score: 0, reason: "sem correspondência semântica" };
  }

  const relevantByIntent = directTermMatches > 0 || hasRecentOrRepairSignal;
  if (relevantByIntent) {
    if (file.type === "page") score += 18;
    if (file.type === "component") score += 14;
    if (file.type === "service") score += 12;
    if (file.type === "api") score += 12;
    if (file.type === "schema" || file.type === "types") score += 10;
    if (file.type === "hook") score += 9;
    if (file.type === "config") score += 3;
  } else if (file.type === "unknown") {
    score -= 8;
  }

  if (isBinaryLike(file.path)) score -= 30;
  if (isDocumentationLike(file.path)) score -= 12;
  if (file.sizeBytes > 250_000) score -= 20;

  const explicitEntityScore = [
    ["cliente", "customer", "user", "lead"],
    ["telefone", "phone", "celular"],
    ["dashboard", "painel", "overview"],
    ["preco", "price", "pricing", "plan", "subscription"],
    ["landing", "hero", "cta"],
  ].some(([...terms]) => {
    const hit = terms.some((term) => pathText.includes(term));
    if (hit) {
      score += 8;
      return true;
    }
    return false;
  });
  if (explicitEntityScore) reasonParts.add("entity");

  if (blueprint && typeof blueprint === "object") {
    const blueprintText = normalize(JSON.stringify(blueprint));
    if (blueprintText.includes(pathText)) score += 10;
    if (file.type === "page" && blueprintText.includes("page")) score += 4;
    if (file.type === "component" && (blueprintText.includes("component") || blueprintText.includes("hero"))) score += 3;
    if (file.type === "service" && (blueprintText.includes("api") || blueprintText.includes("billing"))) score += 3;
  }

  if (recentFiles.includes(file.path)) {
    score += 10;
    reasonParts.add("recent");
  }
  if (repairIssues.some((issue) => issue.file && normalize(issue.file).includes(pathText))) {
    score += 14;
    reasonParts.add("repair");
  }

  if (file.imports.some((imp) => /customer|client|pricing|dashboard|landing|plan|subscription|phone|telef/i.test(imp))) {
    score += 6;
    reasonParts.add("dependency");
  }

  if (file.type === "unknown" && directTermMatches === 0 && !hasRecentOrRepairSignal) {
    score -= 6;
  }

  const reason = reasonParts.size ? [...reasonParts].slice(0, 4).join(", ") : "compatibilidade geral";
  return { score, reason };
}

export function estimateContextTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function selectRelevantFiles(input: ContextSelectionInput): SelectedContextFile[] {
  const repoMap = input.repoMap ?? { files: [], totalFiles: 0, stats: { pages: 0, components: 0, services: 0, apis: 0, schemas: 0, unknown: 0 }, projectId: input.projectId ?? null, generatedAt: new Date().toISOString(), exclusions: [], };
  const budget = {
    maxFiles: input.maxFiles ?? DEFAULT_CONTEXT_BUDGET.maxFiles,
    maxBytes: input.maxBytes ?? DEFAULT_CONTEXT_BUDGET.maxBytes,
    maxEstimatedTokens: input.maxEstimatedTokens ?? DEFAULT_CONTEXT_BUDGET.maxEstimatedTokens,
    maxDependencyDepth: input.maxDependencyDepth ?? DEFAULT_CONTEXT_BUDGET.maxDependencyDepth,
  };

  const repairIssues = input.repairIssues ?? [];
  const recentFiles = input.recentFiles ?? [];

  const priorityFiles = repoMap.files
    .filter((file) => !isBinaryLike(file.path))
    .filter((file) => file.type !== "unknown" || !isDocumentationLike(file.path))
    .map((file) => ({
      file,
      ...scoreCandidate(file, input.request, input.blueprint, recentFiles, repairIssues),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, budget.maxFiles * 4);

  const selected: SelectedContextFile[] = [];
  let bytes = 0;
  let tokenBudget = 0;

  for (const entry of priorityFiles) {
    if (selected.length >= budget.maxFiles) break;
    const size = entry.file.sizeBytes || 14_000;
    if (bytes + size > budget.maxBytes) continue;
    const estimated = estimateContextTokens(JSON.stringify(entry.file));
    if (tokenBudget + estimated > budget.maxEstimatedTokens) continue;
    if (entry.file.depth > budget.maxDependencyDepth) continue;

    selected.push({
      path: entry.file.path,
      type: entry.file.type,
      score: entry.score,
      reason: `score=${entry.score}; ${entry.reason}`,
      sizeBytes: size,
      imports: entry.file.imports,
      excerpt: undefined,
      dependencyDepth: Math.min(entry.file.depth, budget.maxDependencyDepth),
      selectionMode: "ranked" as const,
    });

    bytes += size;
    tokenBudget += estimated;
  }

  if (selected.length > 0) {
    const expanded: SelectedContextFile[] = selected.map((file) => ({
      ...file,
      selectionMode: file.dependencyDepth > 1 ? "dependency-expanded" : "ranked",
    }));
    return expanded;
  }

  const explicitSignals = repoMap.files
    .filter((file) => !isBinaryLike(file.path))
    .filter((file) => ["page", "component", "service", "api", "types", "schema", "hook"].includes(file.type))
    .map((file) => ({
      file,
      ...scoreCandidate(file, input.request, input.blueprint, recentFiles, repairIssues),
    }))
    .filter((entry) => entry.score > 0 && (entry.reason !== "sem correspondência semântica"))
    .sort((a, b) => b.score - a.score);

  if (explicitSignals.length === 0) {
    return [];
  }

  return explicitSignals.slice(0, Math.min(3, budget.maxFiles)).map((entry) => ({
    path: entry.file.path,
    type: entry.file.type,
    score: entry.score,
    reason: `fallback explícito; ${entry.reason}`,
    sizeBytes: entry.file.sizeBytes,
    imports: entry.file.imports,
    excerpt: undefined,
    dependencyDepth: Math.min(entry.file.depth, budget.maxDependencyDepth),
    selectionMode: "fallback" as const,
  }));
}

export function selectFilesForRequest(input: ContextSelectionInput): SelectedContextFile[] {
  return selectRelevantFiles(input);
}
