import { describe, expect, it } from "vitest";
import { createResourceRegistry, registerResource } from "./registry";
import type { Resource } from "./types";
import { getIcon, searchIcon } from "./icon-provider";
import { getMotion, searchMotion } from "./motion-provider";

function makeIcon(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "lucide-star",
    kind: "icon",
    name: "Star",
    source: "external",
    provider: "lucide",
    license: "ISC",
    commercialAllowed: true,
    tags: ["icon", "favorite", "status"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["status", "actions", "rating"],
    accessMode: "npm",
    contextBundle: "Compact metadata for a star icon; no SVG payload in context.",
    riskyDependencies: ["react"],
    fallbackStrategy: "Use a local fallback star icon.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 95,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
    ...overrides,
  };
}

function makeMotion(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "motion-fade-up",
    kind: "motion",
    name: "fade-up",
    source: "external",
    provider: "motion",
    license: "MIT",
    commercialAllowed: true,
    tags: ["motion", "entrance", "animate"],
    techStack: ["react", "next"],
    bestFor: ["hero", "cards", "micro-interactions"],
    accessMode: "npm",
    contextBundle: "Compact metadata for fade-up motion; no animation source code in context.",
    riskyDependencies: ["framer-motion"],
    fallbackStrategy: "Use CSS transform transitions if the motion primitive is unavailable.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 94,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("icon and motion providers", () => {
  it("searches icons by provider and compact metadata", () => {
    const registry = createResourceRegistry();
    registerResource(makeIcon({ id: "icon-a", name: "sparkle" }), registry);
    registerResource(makeIcon({ id: "icon-b", name: "check", provider: "tabler" }), registry);

    const result = searchIcon({ provider: "lucide", query: "sparkle" }, registry as never);

    expect(result.map((item) => item.id)).toContain("icon-a");
    expect(result[0]).not.toHaveProperty("code");
  });

  it("gets an icon by id without exposing asset payloads", () => {
    const registry = createResourceRegistry();
    registerResource(makeIcon({ id: "icon-lookup", name: "arrow-right" }), registry);

    const icon = getIcon("icon-lookup", registry);

    expect(icon?.id).toBe("icon-lookup");
    expect(icon?.reference.kind).toBe("resource");
    expect(icon?.contextBundle).toContain("Compact metadata");
  });

  it("searches motions by tag and scenario", () => {
    const registry = createResourceRegistry();
    registerResource(makeMotion({ id: "motion-hero", tags: ["motion", "hero", "fade"] }), registry);
    registerResource(makeMotion({ id: "motion-card", tags: ["scroll", "motion"], bestFor: ["cards"] }), registry);

    const result = searchMotion({ tags: ["motion", "hero"], bestFor: ["hero"] }, registry as never);

    expect(result.map((item) => item.id)).toEqual(["motion-hero"]);
  });

  it("gets a motion resource and keeps the result compact", () => {
    const registry = createResourceRegistry();
    registerResource(makeMotion({ id: "motion-lookup", name: "slide-in" }), registry);

    const motion = getMotion("motion-lookup", registry);

    expect(motion?.id).toBe("motion-lookup");
    expect(motion?.name).toBe("slide-in");
    expect(motion?.reference.kind).toBe("resource");
  });
});
