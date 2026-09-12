import { validateResource } from "./schema";
import type {
  Resource,
  ResourceRegistry,
  SearchResourcesFilters,
} from "./types";

const normalizeList = (items?: string[]) =>
  (items ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean);

function sortResources(resources: Resource[]) {
  return [...resources].sort((a, b) => a.name.localeCompare(b.name));
}

function matchesFilter(resource: Resource, filters: SearchResourcesFilters) {
  if (filters.kind && resource.kind !== filters.kind) return false;

  if (filters.provider && resource.provider.toLowerCase() !== filters.provider.toLowerCase()) {
    return false;
  }

  const wantedTags = normalizeList(filters.tags);
  if (wantedTags.length > 0) {
    const resourceTags = normalizeList(resource.tags);
    const hasAllTags = wantedTags.every((tag) => resourceTags.includes(tag));
    if (!hasAllTags) return false;
  }

  const wantedTech = normalizeList(filters.techStack);
  if (wantedTech.length > 0) {
    const resourceTech = normalizeList(resource.techStack);
    const hasAllTech = wantedTech.every((tech) => resourceTech.includes(tech));
    if (!hasAllTech) return false;
  }

  const wantedBestFor = normalizeList(filters.bestFor);
  if (wantedBestFor.length > 0) {
    const resourceBestFor = normalizeList(resource.bestFor);
    const hasAllBestFor = wantedBestFor.every((value) => resourceBestFor.includes(value));
    if (!hasAllBestFor) return false;
  }

  return true;
}

export const DEFAULT_RESOURCES: Resource[] = [
  {
    id: "shadcn-ui",
    kind: "component",
    name: "shadcn/ui",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "component", "tailwind", "design-system"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["dashboard", "admin", "landing"],
    accessMode: "repo",
    contextBundle: "React component registry with Tailwind-ready primitives; metadata only, no code block embedded.",
    riskyDependencies: ["tailwind", "clsx"],
    fallbackStrategy: "Use internal component primitive if registry lookup is unavailable.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 96,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "shadcn-button",
    kind: "component",
    name: "button",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "button", "action", "saas", "cta"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["landing", "dashboard", "checkout"],
    accessMode: "repo",
    contextBundle: "Primary action component for CTAs and form actions. Metadata-only reference to a shadcn primitive.",
    riskyDependencies: ["tailwind", "class-variance-authority"],
    fallbackStrategy: "Use a local button primitive if the component registry lookup is unavailable.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 95,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "shadcn-card",
    kind: "component",
    name: "card",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "card", "content", "premium"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["pricing", "dashboard", "product"],
    accessMode: "repo",
    contextBundle: "Container component for premium info blocks, pricing tables and product content.",
    riskyDependencies: ["tailwind"],
    fallbackStrategy: "Use a local card wrapper with rounded borders and soft shadows.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 94,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "shadcn-dialog",
    kind: "component",
    name: "dialog",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "modal", "dialog", "overlay"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["settings", "confirmation", "checkout"],
    accessMode: "repo",
    contextBundle: "Modal and overlay primitive for confirmation flows, forms and focused actions.",
    riskyDependencies: ["tailwind", "radix-ui"],
    fallbackStrategy: "Use a local modal pattern if the dialog is unavailable.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 93,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "shadcn-input",
    kind: "component",
    name: "input",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "input", "form", "field"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["forms", "signup", "login"],
    accessMode: "repo",
    contextBundle: "Form field primitive for text, email and password inputs with consistent styling.",
    riskyDependencies: ["tailwind"],
    fallbackStrategy: "Use a local form input style with validation states.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 94,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "shadcn-form",
    kind: "component",
    name: "form",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "form", "validation", "fields"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["signup", "lead-capture", "checkout"],
    accessMode: "repo",
    contextBundle: "Form primitive for validation-friendly forms and field grouping in React apps.",
    riskyDependencies: ["tailwind", "react-hook-form"],
    fallbackStrategy: "Use a local validated form structure if the utility is unavailable.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 92,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "shadcn-tabs",
    kind: "component",
    name: "tabs",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "tabs", "switcher", "content"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["features", "pricing", "overview"],
    accessMode: "repo",
    contextBundle: "Tabbed section primitive for switching content blocks and segmented views.",
    riskyDependencies: ["tailwind", "radix-ui"],
    fallbackStrategy: "Use a local segmented control if tabs are not available.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 92,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "shadcn-accordion",
    kind: "component",
    name: "accordion",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "accordion", "faq", "collapse"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["faq", "feature-list", "help-center"],
    accessMode: "repo",
    contextBundle: "Expandable list primitive for FAQ blocks, collapsible sections and information panels.",
    riskyDependencies: ["tailwind", "radix-ui"],
    fallbackStrategy: "Use a local accordion pattern if the primitive is unavailable.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 91,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "shadcn-badge",
    kind: "component",
    name: "badge",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "badge", "status", "tag"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["status", "labels", "chips"],
    accessMode: "repo",
    contextBundle: "Small status chip primitive for labels, categories and activity states.",
    riskyDependencies: ["tailwind"],
    fallbackStrategy: "Use a local badge or pill style with soft contrast.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 90,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "shadcn-navigation-menu",
    kind: "component",
    name: "navigation-menu",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "nav", "menu", "header"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["header", "marketing", "product-nav"],
    accessMode: "repo",
    contextBundle: "Menu and navigation primitive for top-level navigation and dropdown sections.",
    riskyDependencies: ["tailwind", "radix-ui"],
    fallbackStrategy: "Use a local header navigation pattern when the component is unavailable.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 91,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "shadcn-dropdown-menu",
    kind: "component",
    name: "dropdown-menu",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "menu", "dropdown", "actions"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["profile", "settings", "actions"],
    accessMode: "repo",
    contextBundle: "Dropdown action menu for user settings, options and quick actions.",
    riskyDependencies: ["tailwind", "radix-ui"],
    fallbackStrategy: "Use a local action menu pattern if the dropdown is unavailable.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 92,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "lucide-icons",
    kind: "icon",
    name: "Lucide",
    source: "external",
    provider: "lucide",
    license: "ISC",
    commercialAllowed: true,
    tags: ["icon", "svg", "ui", "system"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["navigation", "status", "actions"],
    accessMode: "npm",
    contextBundle: "Tree-shakable SVG icon set for React and Next.js; compact metadata only.",
    riskyDependencies: ["react"],
    fallbackStrategy: "Use a fallback icon set from internal primitives.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 95,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "motion-library",
    kind: "motion",
    name: "Motion",
    source: "external",
    provider: "motion",
    license: "MIT",
    commercialAllowed: true,
    tags: ["animation", "motion", "react"],
    techStack: ["react", "next"],
    bestFor: ["hero", "micro-interactions", "scroll"],
    accessMode: "npm",
    contextBundle: "Animation library for React with motion presets and performance-oriented APIs.",
    riskyDependencies: ["react"],
    fallbackStrategy: "Use CSS transforms and Tailwind transitions if motion library is unavailable.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 94,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "threejs-core",
    kind: "3d",
    name: "Three.js",
    source: "external",
    provider: "threejs",
    license: "MIT",
    commercialAllowed: true,
    tags: ["3d", "webgl", "scene", "graphics"],
    techStack: ["react", "next", "three"],
    bestFor: ["immersive-hero", "product-viewer", "visualization"],
    accessMode: "npm",
    contextBundle: "Core 3D engine for scenes, cameras, materials and rendering; not a UI library.",
    riskyDependencies: ["three"],
    fallbackStrategy: "Use a static image fallback or a simplified product visual.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 90,
    costBand: "medium",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "react-three-fiber",
    kind: "3d",
    name: "React Three Fiber",
    source: "external",
    provider: "pmndrs",
    license: "MIT",
    commercialAllowed: true,
    tags: ["react", "3d", "scene", "webgl"],
    techStack: ["react", "next", "three"],
    bestFor: ["interactive-3d", "viewer", "product-experience"],
    accessMode: "npm",
    contextBundle: "Declarative React wrapper for Three.js; better for app-level 3D integration.",
    riskyDependencies: ["three", "react"],
    fallbackStrategy: "Render a static image or fallback component when 3D is not available.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 92,
    costBand: "medium",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "magic-ui",
    kind: "component",
    name: "Magic UI",
    source: "external",
    provider: "magicui",
    license: "NÃO CONFIRMADO",
    commercialAllowed: false,
    tags: ["component", "ui", "landing", "gradient"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["landing", "marketing", "premium-ui"],
    accessMode: "repo",
    contextBundle: "Landing-focused component collection with polished marketing visuals and UI motion patterns.",
    riskyDependencies: ["tailwind", "react"],
    fallbackStrategy: "Use a custom internal premium section if licensing cannot be confirmed.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 89,
    costBand: "medium",
    availability: "unknown",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "react-bits",
    kind: "component",
    name: "React Bits",
    source: "external",
    provider: "reactbits",
    license: "NÃO CONFIRMADO",
    commercialAllowed: false,
    tags: ["component", "animation", "ui", "examples"],
    techStack: ["react", "next"],
    bestFor: ["experiments", "micro-interactions", "prototype"],
    accessMode: "repo",
    contextBundle: "Snippet-driven component gallery for rich UI patterns and demos.",
    riskyDependencies: ["react"],
    fallbackStrategy: "Use a curated internal component pattern instead of blindly copying external snippets.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 82,
    costBand: "medium",
    availability: "unknown",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "poly-haven",
    kind: "3d",
    name: "Poly Haven",
    source: "external",
    provider: "polyhaven",
    license: "CC0",
    commercialAllowed: true,
    tags: ["3d", "hdr", "texture", "asset"],
    techStack: ["three", "webgl", "react"],
    bestFor: ["environments", "textures", "visualization"],
    accessMode: "repo",
    contextBundle: "Open 3D and environment assets suitable for high-quality visual scenes and product backdrops.",
    riskyDependencies: ["three"],
    fallbackStrategy: "Use generated or internal fallback textures when no suitable asset is found.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 93,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "kenney-assets",
    kind: "game_asset",
    name: "Kenney",
    source: "external",
    provider: "kenney",
    license: "CC0 / free assets",
    commercialAllowed: true,
    tags: ["game", "2d", "3d", "sprite"],
    techStack: ["webgl", "react"],
    bestFor: ["mini-games", "ui-objects", "game-props"],
    accessMode: "repo",
    contextBundle: "Free game asset library for props, sprites, UI and 3D packs for game-oriented experiences.",
    riskyDependencies: ["three"],
    fallbackStrategy: "Use a local placeholder or custom stylized prop if a direct match is not present.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 91,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
  {
    id: "user-gallery-private",
    kind: "image",
    name: "Galeria pessoal do usuário",
    source: "user-gallery",
    provider: "user-gallery",
    license: "NÃO APLICÁVEL",
    commercialAllowed: false,
    tags: ["gallery", "private", "user-content"],
    techStack: ["web"],
    bestFor: ["brand-custom", "client-assets"],
    accessMode: "manual",
    contextBundle: "Private gallery created by the user; never included in automatic search results.",
    riskyDependencies: [],
    fallbackStrategy: "Only use when the user explicitly requests a gallery asset by name or context.",
    requiresUserConsent: true,
    userGalleryOnly: true,
    qualityScore: 100,
    costBand: "low",
    availability: "unknown",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
  },
];

export function createResourceRegistry(resources: Resource[] = []): ResourceRegistry {
  const registry: ResourceRegistry = { resources: new Map<string, Resource>() };

  for (const resource of resources) {
    const parsed = validateResource(resource);
    if (!parsed.success) {
      throw new Error(`Recurso inválido: ${resource.id}`);
    }
    registry.resources.set(resource.id, parsed.data);
  }

  return registry;
}

export function createDefaultResourceRegistry(): ResourceRegistry {
  return createResourceRegistry(DEFAULT_RESOURCES);
}

export const resourceRegistry = createDefaultResourceRegistry();

export function registerResource(resource: Resource, registry: ResourceRegistry = resourceRegistry): Resource {
  const parsed = validateResource(resource);
  if (!parsed.success) {
    throw new Error(`Recurso inválido: ${parsed.error.message}`);
  }

  registry.resources.set(parsed.data.id, parsed.data);
  return parsed.data;
}

export function getResource(resourceId: string, registry: ResourceRegistry = resourceRegistry): Resource | undefined {
  return registry.resources.get(resourceId);
}

export function listResources(
  registry: ResourceRegistry = resourceRegistry,
  includeUserGallery = false,
): Resource[] {
  const allowed = [...registry.resources.values()].filter((resource) => {
    if (resource.userGalleryOnly || resource.requiresUserConsent) {
      return includeUserGallery;
    }
    return true;
  });
  return sortResources(allowed);
}

export function searchResources(
  filters: SearchResourcesFilters = {},
  registry: ResourceRegistry = resourceRegistry,
): Resource[] {
  const includeUserGallery = filters.includeUserGallery ?? false;

  const resources = [...registry.resources.values()].filter((resource) => {
    if (resource.userGalleryOnly || resource.requiresUserConsent) {
      if (!includeUserGallery) return false;
    }

    return matchesFilter(resource, filters);
  });

  return sortResources(resources);
}
