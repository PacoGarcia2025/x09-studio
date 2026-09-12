import { describe, expect, it } from "vitest";
import {
  createResourceRegistry,
  getResource,
  listResources,
  registerResource,
  searchResources,
} from "./registry";
import type { Resource } from "./types";

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "sample-component",
    kind: "component",
    name: "Sample Component",
    source: "external",
    provider: "sample-provider",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "dashboard"],
    techStack: ["react", "tailwind"],
    bestFor: ["dashboard"],
    accessMode: "repo",
    contextBundle: "Compact metadata for a dashboard component; no code included.",
    riskyDependencies: ["react"],
    fallbackStrategy: "Use a local UI primitive when the external reference is unavailable.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 90,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("resource registry", () => {
  it("registers a resource", () => {
    const registry = createResourceRegistry();
    const resource = makeResource({ id: "reg-1", name: "Registry Component" });

    const stored = registerResource(resource, registry);

    expect(stored).toEqual(resource);
    expect(getResource("reg-1", registry)).toEqual(resource);
  });

  it("recovers a resource by id", () => {
    const registry = createResourceRegistry();
    const resource = makeResource({ id: "lookup-1", name: "Lookup Card" });
    registerResource(resource, registry);

    expect(getResource("lookup-1", registry)).toEqual(resource);
    expect(getResource("missing-resource", registry)).toBeUndefined();
  });

  it("searches by category", () => {
    const registry = createResourceRegistry();
    registerResource(makeResource({ id: "comp-a", kind: "component", name: "A" }), registry);
    registerResource(makeResource({ id: "comp-b", kind: "component", name: "B" }), registry);
    registerResource(makeResource({ id: "icon-a", kind: "icon", name: "I" }), registry);

    const results = searchResources({ kind: "component" }, registry);

    expect(results.map((item) => item.id)).toEqual(["comp-a", "comp-b"]);
  });

  it("searches by tags", () => {
    const registry = createResourceRegistry();
    registerResource(makeResource({ id: "tag-1", tags: ["ui", "landing"] }), registry);
    registerResource(makeResource({ id: "tag-2", tags: ["ui", "dashboard"] }), registry);
    registerResource(makeResource({ id: "tag-3", tags: ["game", "ui"] }), registry);

    const results = searchResources({ tags: ["ui", "landing"] }, registry);

    expect(results.map((item) => item.id)).toEqual(["tag-1"]);
  });

  it("searches by provider", () => {
    const registry = createResourceRegistry();
    registerResource(makeResource({ id: "provider-1", provider: "shadcn" }), registry);
    registerResource(makeResource({ id: "provider-2", provider: "lucide" }), registry);

    const results = searchResources({ provider: "shadcn" }, registry);

    expect(results.map((item) => item.id)).toEqual(["provider-1"]);
  });

  it("blocks user gallery resources from automatic search", () => {
    const registry = createResourceRegistry();
    registerResource(
      makeResource({
        id: "gallery-asset",
        kind: "image",
        name: "User Private Asset",
        source: "user-gallery",
        provider: "user-gallery",
        requiresUserConsent: true,
        userGalleryOnly: true,
        tags: ["private", "user"],
      }),
      registry,
    );

    expect(searchResources({ kind: "image" }, registry).some((item) => item.id === "gallery-asset")).toBe(false);
    expect(searchResources({ kind: "image", includeUserGallery: true }, registry).some((item) => item.id === "gallery-asset")).toBe(true);
  });

  it("stores metadata only without embedding code", () => {
    const resource = makeResource({
      contextBundle: "Mini metadata for hero section: premium design, motion and CTA. No component code, no image bytes, no asset payload.",
    });

    expect(resource.contextBundle).not.toContain("export default");
    expect(resource.contextBundle).not.toContain("<div");
    expect(resource.contextBundle).not.toContain("base64");
  });

  it("behaves deterministically", () => {
    const registry = createResourceRegistry();
    registerResource(makeResource({ id: "zeta", name: "Zeta" }), registry);
    registerResource(makeResource({ id: "alpha", name: "Alpha" }), registry);
    registerResource(makeResource({ id: "beta", name: "Beta" }), registry);

    const first = listResources(registry);
    const second = listResources(registry);

    expect(first).toEqual(second);
    expect(first.map((item) => item.id)).toEqual(["alpha", "beta", "zeta"]);
  });
});
