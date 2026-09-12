import { describe, expect, it } from "vitest";
import { composeExperience } from "./index";

describe("experience composition", () => {
  it("creates a structured experience from blueprint and creative patterns", () => {
    const result = composeExperience({
      prompt: "landing imobiliaria premium com hero e cards",
      blueprint: {
        industry: "imobiliaria",
        productType: "application",
        experience: "premium",
        modules: ["hero", "cards", "cta"],
      },
      patterns: ["hero-cinematic", "cards-bento"],
    });

    expect(result.summary.toLowerCase()).toContain("imobiliaria");
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.sections[0]?.visualTone).toBeTruthy();
  });
});
