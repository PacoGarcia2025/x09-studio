import { describe, expect, it } from "vitest";
import type { Resource } from "@/lib/resource-registry";
import { selectResourceCandidates } from "./selection";

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "decision-sample",
    kind: "component",
    name: "Sample Component",
    source: "internal",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["hero", "cta"],
    techStack: ["react", "tailwind"],
    bestFor: ["landing"],
    accessMode: "repo",
    contextBundle: "Metadata-only reference.",
    riskyDependencies: ["tailwind"],
    fallbackStrategy: "Use local primitive.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 95,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("resource selection integration", () => {
  it("keeps the candidate list minimal and deterministic for a strong local match", () => {
    const result = selectResourceCandidates({
      kind: "component",
      query: "hero premium",
      resources: [makeResource({ id: "hero-1", name: "Hero Premium", tags: ["hero", "landing", "premium"] })],
      projectContext: { goal: "landing premium" },
    });

    expect(result.decision).toBe("reuse");
    expect(result.candidates.length).toBeLessThanOrEqual(3);
    expect(result.reason).toContain("adequado");
  });
});
