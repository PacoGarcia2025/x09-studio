import { describe, expect, it } from "vitest";
import { evaluateResourceDecision } from "./decision-layer";
import type { Resource } from "@/lib/resource-registry";

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "decision-sample",
    kind: "component",
    name: "Sample Component",
    source: "external",
    provider: "shadcn",
    license: "MIT",
    commercialAllowed: true,
    tags: ["ui", "cta"],
    techStack: ["react", "tailwind"],
    bestFor: ["landing"],
    accessMode: "repo",
    contextBundle: "Metadata-only reference.",
    riskyDependencies: ["tailwind"],
    fallbackStrategy: "Use local primitive.",
    requiresUserConsent: false,
    userGalleryOnly: false,
    qualityScore: 92,
    costBand: "low",
    availability: "ready",
    lastValidatedAt: "2026-09-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("decision layer", () => {
  it("marks an existing suitable resource as reuse", () => {
    const result = evaluateResourceDecision({
      kind: "component",
      query: "button",
      resources: [makeResource({ id: "reuse-button", qualityScore: 95, commercialAllowed: true })],
      projectContext: { goal: "landing premium" },
    });

    expect(result.decision).toBe("reuse");
    expect(result.reason).toContain("adequado");
  });

  it("marks an external resource as search when the fit exists but not local", () => {
    const result = evaluateResourceDecision({
      kind: "icon",
      query: "star",
      resources: [makeResource({ id: "search-icon", kind: "icon", provider: "lucide", qualityScore: 90, commercialAllowed: true })],
      allowExternalSearch: true,
      projectContext: { goal: "UI de status" },
    });

    expect(result.decision).toBe("search");
    expect(result.candidates.length).toBe(1);
  });

  it("marks highly specific or missing resources as generate", () => {
    const result = evaluateResourceDecision({
      kind: "image",
      query: "cafe gourmet em estilo anti-generic",
      resources: [],
      projectContext: { goal: "campanha ultra específica" },
    });

    expect(result.decision).toBe("generate");
    expect(result.reason).toContain("específico");
  });

  it("requires explicit consent for personal gallery resources", () => {
    const result = evaluateResourceDecision({
      kind: "image",
      query: "minha foto do produto",
      resources: [makeResource({ id: "personal-gallery", kind: "image", source: "user-gallery", provider: "user-gallery", requiresUserConsent: true, userGalleryOnly: true })],
      projectContext: { goal: "hero personalizado" },
    });

    expect(result.decision).toBe("consent-required");
  });
});
