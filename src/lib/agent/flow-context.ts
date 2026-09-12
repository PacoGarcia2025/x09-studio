import { buildCreativeDirection } from "@/lib/creative-engine";
import { composeExperience } from "@/lib/experience-composition";
import { discoverProjectHints } from "@/lib/discovery-engine";
import { resolveBlueprint, resolveExperienceDna } from "@/lib/dna";
import { evaluateResourceDecision } from "@/lib/resource-decision";
import { listResources, resourceRegistry } from "@/lib/resource-registry";
import {
  searchComponentTool,
  searchIconTool,
  searchImageTool,
  searchMotionTool,
} from "@/lib/tool-layer/resource-tools";

export type FlowContextInput = {
  prompt: string;
  hasExistingApp?: boolean;
  projectContext?: {
    goal?: string;
    segment?: string;
    requiresBrandAssets?: boolean;
  };
};

const decisionModeMap = {
  reuse: "reuse_existing",
  search: "search_resource",
  generate: "generate_resource",
  "consent-required": "skip",
} as const;

function needsImageResource(prompt: string, blueprint: { industry?: string; productType?: string; experience?: string }): boolean {
  const text = prompt.toLowerCase();
  const explicitNoImage = /sem (imagens?|fotos?|image|photo)|without (image|photo)|no (image|photo)|sem visual/i;
  if (explicitNoImage.test(text)) return false;

  const imageSignals = /imagem|image|foto|photo|gallery|galeria|portfolio|showcase|hero.*(image|foto)|product.*(photo|image)|property|listing|visual/i;

  if (imageSignals.test(text)) return true;
  if (blueprint.industry === "imobiliaria" || blueprint.productType === "portal") {
    return /imovel|apartamento|casa|property|listing|galeria/.test(text);
  }
  return false;
}

function needsMotionResource(prompt: string): boolean {
  const text = prompt.toLowerCase();
  return /motion|anim|cinematic|video|transição|transition|storytelling|microinteraction|loop|parallax/.test(text);
}

function determineNeededResourceTools(prompt: string, blueprint: { industry?: string; productType?: string; experience?: string }) {
  const text = prompt.toLowerCase();
  const hasExplicitImageNeed = needsImageResource(prompt, blueprint);
  const hasExplicitMotionNeed = needsMotionResource(prompt);
  const hasExplicitBrandNeed = /icon|icone|logo|marca|brand|benefit|feature|serviço|funcionalidade|social|cta/.test(text);

  const componentNeeded = /landing|home|hero|pricing|faq|cta|dashboard|site|app|produto|servico|cards|showcase|checkout|form|menu|catalogo|gallery/.test(text);
  const iconNeeded = hasExplicitBrandNeed || /landing|site|inicio|dashboard|mobile|app|hero|pricing|faq|cta|imobiliaria/.test(text);
  const motionNeeded = hasExplicitMotionNeed || /cinematic|luxury|editorial|immersive|motion.*hero|hero.*motion/.test(text);
  const imageNeeded = hasExplicitImageNeed;

  return {
    component: componentNeeded || Boolean(text),
    icon: iconNeeded,
    motion: motionNeeded,
    image: imageNeeded,
  };
}

function compactSelectedResource(resource: Record<string, unknown>) {
  return {
    id: resource.id ?? "unknown",
    kind: resource.kind ?? "component",
    name: resource.name ?? "resource",
    provider: resource.provider ?? "unknown",
    source: resource.source ?? "external",
    qualityScore: resource.qualityScore ?? 0,
    reference: resource.reference ?? { kind: "resource", resourceId: resource.id ?? "unknown", location: "resource-registry" },
  };
}

export function buildGenerationFlowContext(input: FlowContextInput) {
  const prompt = input.prompt ?? "";
  const blueprint = resolveBlueprint(prompt, { hasExistingApp: Boolean(input.hasExistingApp) });
  const experienceDna = resolveExperienceDna(prompt);
  const discovered = discoverProjectHints({
    query: prompt,
    segment: blueprint.industry,
    constraints: blueprint.modules ?? blueprint.priorities ?? [],
  });
  const toolPlan = determineNeededResourceTools(prompt, blueprint);

  const resourceSearches = [
    ...(toolPlan.component ? [searchComponentTool({ query: prompt, limit: 3 }, resourceRegistry)] : []),
    ...(toolPlan.icon ? [searchIconTool({ query: prompt, limit: 3 }, resourceRegistry)] : []),
    ...(toolPlan.motion ? [searchMotionTool({ query: prompt, limit: 3 }, resourceRegistry)] : []),
    ...(toolPlan.image ? [searchImageTool({ query: prompt, limit: 3 }, resourceRegistry)] : []),
  ];

  const toolResults = resourceSearches.flatMap((tool) => (tool.result.items as Record<string, unknown>[])) ?? [];
  const selectedResources =
    toolResults.length > 0
      ? toolResults.slice(0, 6).map(compactSelectedResource)
      : listResources(resourceRegistry)
          .filter((resource) => resource.kind === "component" || resource.kind === "icon" || resource.kind === "motion" || resource.kind === "image")
          .slice(0, 6)
          .map((resource) => compactSelectedResource(resource as Record<string, unknown>));

  const resourceDecision = evaluateResourceDecision({
    kind: selectedResources[0]?.kind === "icon" ? "icon" : "component",
    query: prompt,
    resources: toolResults.map((resource) => ({
      id: String(resource.id ?? "resource"),
      kind: String(resource.kind ?? "component") as "component" | "icon" | "motion" | "image",
      name: String(resource.name ?? "resource"),
      source: String(resource.source ?? "external") as "internal" | "external" | "generated" | "user-gallery",
      provider: String(resource.provider ?? "unknown"),
      license: String(resource.license ?? "MIT"),
      commercialAllowed: Boolean(resource.commercialAllowed ?? true),
      tags: Array.isArray(resource.tags) ? resource.tags.map(String) : [],
      techStack: Array.isArray(resource.techStack) ? resource.techStack.map(String) : [],
      bestFor: Array.isArray(resource.bestFor) ? resource.bestFor.map(String) : [],
      accessMode: String(resource.accessMode ?? "repo") as "repo" | "cdn" | "npm" | "api" | "generated" | "local" | "manual",
      contextBundle: String(resource.contextBundle ?? "Metadata-only reference."),
      riskyDependencies: Array.isArray(resource.riskyDependencies) ? resource.riskyDependencies.map(String) : [],
      fallbackStrategy: String(resource.fallbackStrategy ?? "Use local primitive."),
      requiresUserConsent: Boolean(resource.requiresUserConsent ?? false),
      userGalleryOnly: Boolean(resource.userGalleryOnly ?? false),
      qualityScore: Number(resource.qualityScore ?? 0),
      costBand: String(resource.costBand ?? "low") as "low" | "medium" | "high",
      availability: String(resource.availability ?? "ready") as "ready" | "rate-limited" | "unknown",
      lastValidatedAt: String(resource.lastValidatedAt ?? new Date().toISOString()),
    })),
    allowExternalSearch: true,
    projectContext: {
      goal: input.projectContext?.goal ?? prompt,
      segment: input.projectContext?.segment ?? blueprint.industry,
      requiresBrandAssets: input.projectContext?.requiresBrandAssets ?? /landing|imobili|premium|marca|hero/.test(prompt.toLowerCase()),
    },
  });

  const creativeDirection = buildCreativeDirection({
    prompt,
    blueprint: {
      industry: blueprint.industry,
      experience: blueprint.experience,
    },
    patterns: [
      blueprint.experience === "premium" ? "hero-cinematic" : "cards-bento",
      "product-showcase",
    ],
  });

  const experienceComposition = composeExperience({
    prompt,
    blueprint: {
      industry: blueprint.industry,
      productType: blueprint.productType,
      experience: blueprint.experience,
      modules: blueprint.modules,
    },
    patterns: [
      creativeDirection.motion.includes("cinematic") ? "hero-cinematic" : creativeDirection.motion.includes("editorial") ? "editorial-split" : creativeDirection.motion.includes("luxury") ? "luxury-grid" : "cards-bento",
    ],
    resources: selectedResources,
    creativeDirection,
  });

  return {
    projectBrief: {
      summary: discovered.ranked[0]?.reason ?? prompt,
      ranked: discovered.ranked.slice(0, 3),
    },
    businessDna: undefined,
    experienceDna,
    blueprint,
    resourceDecision: {
      ...resourceDecision,
      mode: decisionModeMap[resourceDecision.decision as keyof typeof decisionModeMap] ?? "skip",
      selectedResources,
    },
    selectedResources,
    creativeDirection,
    experienceComposition,
  };
}
