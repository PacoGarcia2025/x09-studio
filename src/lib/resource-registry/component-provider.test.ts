import { describe, expect, it } from "vitest";
import { getResource, registerResource } from "./registry";
import { getComponent, listComponentResources, searchComponent } from "./component-provider";
import { createResourceRegistry } from "./registry";
import type { Resource } from "./types";

function makeComponent(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "sample-component",
    kind: "component",
    name: "Sample Component",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "saas"],
    techStack: ["react", "next", "tailwind"],
    bestFor: ["dashboard"],
    accessMode: "repo",
    contextBundle: "Metadata-only component reference for dashboard components.",
    riskyDependencies: ["tailwind"],
    fallbackStrategy: "Use a local fallback if external metadata is unavailable.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 90,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("component provider", () => {
  it("searches a component by name", () => {
    const registry = createResourceRegistry();
    registerResource(makeComponent({ id: "btn-1", name: "button", tags: ["cta", "action"] }), registry);
    registerResource(makeComponent({ id: "card-1", name: "card", tags: ["content"] }), registry);

    const results = searchComponent({ query: "button" }, registry as never);
    expect(results.map((item) => item.id)).toContain("btn-1");
  });

  it("searches components by tags", () => {
    const registry = createResourceRegistry();
    registerResource(makeComponent({ id: "pricing-1", tags: ["pricing", "saas", "premium"] }), registry);
    registerResource(makeComponent({ id: "billing-1", tags: ["billing", "saas"] }), registry);

    const results = searchComponent({ tags: ["pricing", "saas"] }, registry as never);
    expect(results.map((item) => item.id)).toEqual(["pricing-1"]);
  });

  it("searches components by provider", () => {
    const registry = createResourceRegistry();
    registerResource(makeComponent({ id: "sh-1", provider: "shadcn" }), registry);
    registerResource(makeComponent({ id: "magic-1", provider: "magicui" }), registry);

    const results = searchComponent({ provider: "shadcn" }, registry as never);
    expect(results.map((item) => item.id)).toEqual(["sh-1"]);
  });

  it("searches components by techStack", () => {
    const registry = createResourceRegistry();
    registerResource(makeComponent({ id: "next-1", techStack: ["react", "next", "tailwind"] }), registry);
    registerResource(makeComponent({ id: "vue-1", techStack: ["vue", "tailwind"] }), registry);

    const results = searchComponent({ techStack: ["react", "next"] }, registry as never);
    expect(results.map((item) => item.id)).toEqual(["next-1"]);
  });

  it("searches components by bestFor", () => {
    const registry = createResourceRegistry();
    registerResource(makeComponent({ id: "dashboard-1", bestFor: ["dashboard", "analytics"] }), registry);
    registerResource(makeComponent({ id: "landing-1", bestFor: ["landing", "marketing"] }), registry);

    const results = searchComponent({ bestFor: ["dashboard"] }, registry as never);
    expect(results.map((item) => item.id)).toEqual(["dashboard-1"]);
  });

  it("gets a component by id", () => {
    const registry = createResourceRegistry();
    registerResource(makeComponent({ id: "dialog-1", name: "dialog" }), registry);

    const result = getComponent("dialog-1", registry);
    expect(result?.id).toBe("dialog-1");
    expect(result?.name).toBe("dialog");
  });

  it("returns compact and limited results", () => {
    const registry = createResourceRegistry();
    registerResource(makeComponent({ id: "a", name: "alpha", tags: ["saas"] }), registry);
    registerResource(makeComponent({ id: "b", name: "beta", tags: ["saas"] }), registry);
    registerResource(makeComponent({ id: "c", name: "gamma", tags: ["saas"] }), registry);

    const results = searchComponent({ tags: ["saas"], limit: 2 }, registry as never);
    expect(results).toHaveLength(2);
    expect(results[0]).not.toHaveProperty("code");
    expect(results[0]).not.toHaveProperty("content");
  });

  it("does not include complete code in the search result", () => {
    const registry = createResourceRegistry();
    registerResource(makeComponent({ id: "code-1", name: "button" }), registry);

    const result = searchComponent({ query: "button" }, registry as never)[0];
    expect(result?.contextBundle).toContain("Metadata-only");
    expect(result?.reference.kind).toBe("resource");
  });

  it("behaves deterministically", () => {
    const registry = createResourceRegistry();
    registerResource(makeComponent({ id: "zeta", name: "zeta" }), registry);
    registerResource(makeComponent({ id: "alpha", name: "alpha" }), registry);
    registerResource(makeComponent({ id: "beta", name: "beta" }), registry);

    const first = searchComponent({ limit: 10 }, registry as never).map((item) => item.id);
    const second = searchComponent({ limit: 10 }, registry as never).map((item) => item.id);

    expect(first).toEqual(second);
  });

  it("integrates with the existing registry", () => {
    const resource = getResource("shadcn-ui");
    expect(resource?.kind).toBe("component");
    expect(resource?.provider).toBe("shadcn");
  });

  it("lists component resources compactly", () => {
    const results = listComponentResources(3);
    expect(results.length).toBeLessThanOrEqual(3);
    expect(results[0]).not.toHaveProperty("code");
  });
});
