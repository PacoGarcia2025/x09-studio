import type { Resource } from "@/lib/resource-registry";

export type ResourceDecision = "reuse" | "search" | "generate" | "consent-required";

export type ResourceDecisionInput = {
  kind: Resource["kind"];
  query: string;
  resources: Resource[];
  allowExternalSearch?: boolean;
  projectContext?: {
    goal?: string;
    segment?: string;
    requiresBrandAssets?: boolean;
  };
};

export type ResourceDecisionResult = {
  decision: ResourceDecision;
  reason: string;
  candidates: Resource[];
};

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function scoreResource(resource: Resource, input: ResourceDecisionInput): number {
  let score = 0;

  const query = normalize(input.query);
  const tags = resource.tags.map(normalize).join(" ");
  const bestFor = resource.bestFor.map(normalize).join(" ");
  const name = normalize(resource.name);
  const provider = normalize(resource.provider);

  if (resource.qualityScore >= 90) score += 25;
  if (resource.qualityScore >= 80) score += 10;

  if (query && (name.includes(query) || tags.includes(query) || bestFor.includes(query))) score += 30;
  if (resource.commercialAllowed) score += 8;
  if (resource.license && resource.license.toLowerCase() !== "não confirmado") score += 8;
  if (resource.availability === "ready") score += 12;
  if (resource.costBand === "low") score += 8;
  if (resource.accessMode === "repo" || resource.accessMode === "cdn" || resource.accessMode === "npm") score += 10;

  if (input.kind === resource.kind) score += 10;
  if (provider.includes("lucide") || provider.includes("shadcn") || provider.includes("motion") || provider.includes("unsplash") || provider.includes("pexels")) score += 6;

  if (resource.requiresUserConsent || resource.userGalleryOnly) score -= 30;
  if (!resource.commercialAllowed) score -= 20;

  return score;
}

export function evaluateResourceDecision(input: ResourceDecisionInput): ResourceDecisionResult {
  const allowed = input.resources.filter((resource) => !resource.userGalleryOnly && !resource.requiresUserConsent);

  if (input.resources.some((resource) => resource.userGalleryOnly || resource.requiresUserConsent)) {
    return {
      decision: "consent-required",
      reason: "Recurso pessoal do usuário detectado; consentimento explícito é obrigatório antes do uso.",
      candidates: input.resources.filter((resource) => resource.userGalleryOnly || resource.requiresUserConsent),
    };
  }

  if (allowed.length === 0) {
    return {
      decision: "generate",
      reason: "Nenhum recurso adequado foi encontrado e a necessidade é um caso específico demais para reutilização direta; a decisão é gerar.",
      candidates: [],
    };
  }

  const ranked = [...allowed].sort((a, b) => scoreResource(b, input) - scoreResource(a, input));
  const best = ranked[0];
  const bestScore = best ? scoreResource(best, input) : 0;

  const isWellMatched = bestScore >= 75 && (best.commercialAllowed || best.license !== "NÃO CONFIRMADO") && best.availability === "ready";

  if (isWellMatched && (best.source === "internal" || best.source === "generated" || !input.allowExternalSearch)) {
    return {
      decision: "reuse",
      reason: "Recurso existente adequado, com qualidade, licença e disponibilidade suficientes para reutilização direta.",
      candidates: ranked.slice(0, 3),
    };
  }

  if ((input.allowExternalSearch ?? false) && isWellMatched && best.source === "external") {
    return {
      decision: "search",
      reason: "O recurso adequado existe fora do projeto atual, mas é um match externo válido para busca controlada e seleção.",
      candidates: ranked.slice(0, 3),
    };
  }

  return {
    decision: "generate",
    reason: "A necessidade é um caso específico demais para reutilização direta; não há candidato suficientemente adequado para garantir qualidade, licença e adequação ao projeto.",
    candidates: ranked.slice(0, 3),
  };
}
