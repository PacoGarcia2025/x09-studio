export const RESOURCE_KINDS = [
  "component",
  "icon",
  "motion",
  "transition",
  "image",
  "video",
  "3d",
  "game_asset",
  "logo",
  "experience",
] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export type AccessMode =
  | "npm"
  | "cdn"
  | "api"
  | "repo"
  | "generated"
  | "local"
  | "manual";

export type CostBand = "low" | "medium" | "high";
export type Availability = "ready" | "rate-limited" | "unknown";

export type ResourceSource =
  | "internal"
  | "external"
  | "generated"
  | "user-gallery";

export type Resource = {
  id: string;
  kind: ResourceKind;
  name: string;
  source: ResourceSource;
  provider: string;
  license: string;
  commercialAllowed: boolean;
  tags: string[];
  techStack: string[];
  bestFor: string[];
  accessMode: AccessMode;
  contextBundle: string;
  riskyDependencies: string[];
  fallbackStrategy: string;
  requiresUserConsent: boolean;
  userGalleryOnly: boolean;
  qualityScore: number;
  costBand: CostBand;
  availability: Availability;
  lastValidatedAt: string;
  dimensions?: string;
  orientation?: string;
  quality?: string;
  referenceUrl?: string;
};

export type ResourceRegistry = {
  resources: Map<string, Resource>;
};

export type SearchResourcesFilters = {
  kind?: ResourceKind;
  tags?: string[];
  provider?: string;
  techStack?: string[];
  bestFor?: string[];
  includeUserGallery?: boolean;
};
