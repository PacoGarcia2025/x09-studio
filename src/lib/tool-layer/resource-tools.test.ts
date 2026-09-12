import { describe, expect, it } from "vitest";
import { createResourceRegistry, registerResource } from "@/lib/resource-registry";
import type { Resource } from "@/lib/resource-registry";
import { getComponentTool, getIconTool, getImageTool, getMotionTool, searchComponentTool, searchIconTool, searchImageTool, searchMotionTool } from "./resource-tools";
import { isToolResult } from "./contracts";

function makeComponent(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "tool-button",
    kind: "component",
    name: "button",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "cta"],
    techStack: ["react", "tailwind"],
    bestFor: ["landing"],
    accessMode: "repo",
    contextBundle: "Metadata-only button primitive.",
    riskyDependencies: ["tailwind"],
    fallbackStrategy: "Use local button primitive.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 95,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("resource tool layer", () => {
  it("creates a typed search component call and compact result", () => {
    const registry = createResourceRegistry();
    registerResource(makeComponent({ id: "tool-search-button", name: "button" }), registry);

    const call = searchComponentTool({ query: "button", limit: 2 }, registry);

    expect(call.name).toBe("search_component");
    expect(call.arguments).toEqual({ query: "button", limit: 2 });
    expect(isToolResult(call.result)).toBe(true);
    expect(call.result.items[0]?.id).toBe("tool-search-button");
    expect(call.result.items[0]).not.toHaveProperty("code");
  });

  it("gets a single icon resource through a tool result", () => {
    const registry = createResourceRegistry();
    registerResource(
      {
        id: "tool-icon-star",
        kind: "icon",
        name: "star",
        source: "external",
        provider: "lucide",
        license: "ISC",
        commercialAllowed: true,
        tags: ["status", "favorite"],
        techStack: ["react"],
        bestFor: ["actions"],
        accessMode: "npm",
        contextBundle: "Compact metadata for star icon.",
        riskyDependencies: ["react"],
        fallbackStrategy: "Fallback to local star.",
        requiresUserConsent: false,
        userGalleryOnly: false,
        qualityScore: 96,
        costBand: "low",
        availability: "ready",
        lastValidatedAt: "2026-09-12T00:00:00.000Z",
      },
      registry,
    );

    const call = getIconTool("tool-icon-star", registry);
    const searchCall = searchIconTool({ query: "star" }, registry);

    expect(call.name).toBe("get_icon");
    expect(call.result.item?.id).toBe("tool-icon-star");
    expect(call.result.item?.reference.kind).toBe("resource");
    expect(searchCall.result.items[0]?.id).toBe("tool-icon-star");
  });

  it("supports image and motion search contracts without internet tooling", () => {
    const registry = createResourceRegistry();
    registerResource(
      {
        id: "tool-motion-hero",
        kind: "motion",
        name: "fade-up",
        source: "external",
        provider: "motion",
        license: "MIT",
        commercialAllowed: true,
        tags: ["motion", "hero"],
        techStack: ["react"],
        bestFor: ["hero"],
        accessMode: "npm",
        contextBundle: "Hero motion metadata.",
        riskyDependencies: ["react"],
        fallbackStrategy: "Use CSS fallback.",
        requiresUserConsent: false,
        userGalleryOnly: false,
        qualityScore: 94,
        costBand: "low",
        availability: "ready",
        lastValidatedAt: "2026-09-12T00:00:00.000Z",
      },
      registry,
    );
    registerResource(
      {
        id: "tool-search-button",
        kind: "component",
        name: "button",
        source: "external",
        provider: "shadcn",
        license: "MIT",
        commercialAllowed: true,
        tags: ["ui", "cta"],
        techStack: ["react", "tailwind"],
        bestFor: ["landing"],
        accessMode: "repo",
        contextBundle: "Metadata-only button primitive.",
        riskyDependencies: ["tailwind"],
        fallbackStrategy: "Use local button primitive.",
        requiresUserConsent: false,
        userGalleryOnly: false,
        qualityScore: 95,
        costBand: "low",
        availability: "ready",
        lastValidatedAt: "2026-09-12T00:00:00.000Z",
      },
      registry,
    );

    const motionSearch = searchMotionTool({ query: "hero" }, registry);
    const imageSearch = searchImageTool({ query: "burger" }, registry);
    const motionGet = getMotionTool("tool-motion-hero", registry);
    const imageGet = getImageTool("tool-motion-hero", registry);
    const componentLookup = getComponentTool("tool-search-button", registry);

    expect(motionSearch.name).toBe("search_motion");
    expect(imageSearch.name).toBe("search_image");
    expect(motionSearch.result.items[0]?.id).toBe("tool-motion-hero");
    expect(imageSearch.result.items).toEqual([]);
    expect(motionGet.result.item?.id).toBe("tool-motion-hero");
    expect(imageGet.result.ok).toBe(false);
    expect(componentLookup.result.item?.id).toBe("tool-search-button");
  });
});
