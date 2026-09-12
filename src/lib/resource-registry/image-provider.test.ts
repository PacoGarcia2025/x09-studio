import { describe, expect, it } from "vitest";
import { createResourceRegistry, registerResource } from "./registry";
import type { Resource } from "./types";
import { getImage, searchImage } from "./image-provider";

function makeImage(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "unsplash-hero",
    kind: "image",
    name: "Café em mesa",
    source: "external",
    provider: "unsplash",
    license: "CC0",
    commercialAllowed: true,
    tags: ["food", "hero", "lifestyle"],
    techStack: ["web", "next"],
    bestFor: ["hero", "restaurant", "landing"],
    accessMode: "cdn",
    contextBundle: "Compact metadata for a hero image; no binary payload is embedded.",
    riskyDependencies: [],
    fallbackStrategy: "Use a local fallback image approved by the client.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 94,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
    dimensions: "1920x1080",
    orientation: "landscape",
    quality: "high",
    referenceUrl: "https://images.unsplash.com/photo-123",
    ...overrides,
  };
}

describe("image provider", () => {
  it("searches existing images by provider and tags", () => {
    const registry = createResourceRegistry();
    registerResource(makeImage({ id: "img-a", provider: "unsplash", tags: ["food", "burger"] }), registry);
    registerResource(makeImage({ id: "img-b", provider: "pexels", tags: ["travel", "nature"] }), registry);

    const results = searchImage({ provider: "unsplash", tags: ["food"], query: "burger" }, registry as never);

    expect(results.map((item) => item.id)).toContain("img-a");
    expect(results[0]).not.toHaveProperty("binary");
  });

  it("gets an image by id with compact metadata", () => {
    const registry = createResourceRegistry();
    registerResource(makeImage({ id: "img-lookup", name: "burger-closeup", dimensions: "1600x1200", orientation: "portrait" }), registry);

    const image = getImage("img-lookup", registry);

    expect(image?.id).toBe("img-lookup");
    expect(image?.reference.kind).toBe("resource");
    expect(image?.dimensions).toBe("1600x1200");
    expect(image?.referenceUrl).toContain("https://");
  });

  it("blocks automatic user gallery image search", () => {
    const registry = createResourceRegistry();
    registerResource(
      makeImage({
        id: "gallery-image",
        source: "user-gallery",
        provider: "user-gallery",
        userGalleryOnly: true,
        requiresUserConsent: true,
        name: "Minha foto de produto",
        tags: ["private"],
      }),
      registry,
    );

    expect(searchImage({ kind: "image" }, registry as never).some((item) => item.id === "gallery-image")).toBe(false);
  });

  it("keeps the result compact and metadata-first", () => {
    const registry = createResourceRegistry();
    registerResource(makeImage({ id: "img-compact" }), registry);

    const result = searchImage({ query: "mesa" }, registry as never)[0];

    expect(result?.contextBundle).toContain("Compact metadata");
    expect(result?.license).toBe("CC0");
    expect(result?.commercialAllowed).toBe(true);
  });
});
