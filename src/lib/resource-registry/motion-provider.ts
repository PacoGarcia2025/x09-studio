import { getResource, listResources, resourceRegistry, searchResources } from "./registry";
import type { Resource, ResourceKind, ResourceRegistry } from "./types";

export type MotionSearchInput = {
  query?: string;
  tags?: string[];
  provider?: string;
  techStack?: string[];
  bestFor?: string[];
  limit?: number;
};

export type MotionRef = {
  id: string;
  name: string;
  kind: ResourceKind;
  provider: string;
  source: Resource["source"];
  license: string;
  commercialAllowed: boolean;
  tags: string[];
  techStack: string[];
  bestFor: string[];
  accessMode: Resource["accessMode"];
  contextBundle: string;
  qualityScore: number;
  costBand: Resource["costBand"];
  availability: Resource["availability"];
  lastValidatedAt: string;
  reference: {
    kind: "resource";
    resourceId: string;
    location: string;
  };
};

function compactResource(resource: Resource): MotionRef {
  return {
    id: resource.id,
    name: resource.name,
    kind: resource.kind,
    provider: resource.provider,
    source: resource.source,
    license: resource.license,
    commercialAllowed: resource.commercialAllowed,
    tags: resource.tags,
    techStack: resource.techStack,
    bestFor: resource.bestFor,
    accessMode: resource.accessMode,
    contextBundle: resource.contextBundle,
    qualityScore: resource.qualityScore,
    costBand: resource.costBand,
    availability: resource.availability,
    lastValidatedAt: resource.lastValidatedAt,
    reference: {
      kind: "resource",
      resourceId: resource.id,
      location: "resource-registry",
    },
  };
}

function textScore(resource: Resource, query?: string): number {
  if (!query) return 0;

  const haystack = [
    resource.name,
    resource.provider,
    resource.tags.join(" "),
    resource.bestFor.join(" "),
    resource.techStack.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;
  return haystack.includes(normalized) ? 1 : 0;
}

export function searchMotion(
  input: MotionSearchInput = {},
  registry: ResourceRegistry = resourceRegistry,
): MotionRef[] {
  const limit = input.limit ?? 5;
  const resources = searchResources(
    {
      kind: "motion",
      tags: input.tags,
      provider: input.provider,
      techStack: input.techStack,
      bestFor: input.bestFor,
    },
    registry,
  );

  const ranked = [...resources]
    .filter((resource) => !resource.userGalleryOnly)
    .sort((a, b) => {
      const scoreA = textScore(a, input.query);
      const scoreB = textScore(b, input.query);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.qualityScore - a.qualityScore;
    })
    .slice(0, limit)
    .map(compactResource);

  if (!input.query) {
    return ranked;
  }

  return ranked.filter((resource) =>
    [resource.name, resource.provider, resource.tags.join(" "), resource.bestFor.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(input.query!.trim().toLowerCase()),
  );
}

export function getMotion(
  resourceId: string,
  registry: ResourceRegistry = resourceRegistry,
): MotionRef | undefined {
  const resource = getResource(resourceId, registry);
  if (!resource) return undefined;
  if (resource.kind !== "motion") return undefined;
  if (resource.userGalleryOnly || resource.requiresUserConsent) return undefined;

  return compactResource(resource);
}

export function listMotionResources(
  limit = 10,
  registry: ResourceRegistry = resourceRegistry,
): MotionRef[] {
  return listResources(registry, false)
    .filter((resource) => resource.kind === "motion" && !resource.userGalleryOnly && !resource.requiresUserConsent)
    .slice(0, limit)
    .map(compactResource);
}
