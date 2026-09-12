import { describe, expect, it } from "vitest";
import { buildCreativeDirection } from "./index";

describe("creative engine foundation", () => {
  it("produces a premium creative direction with concrete palette and motion guidance", () => {
    const result = buildCreativeDirection({
      prompt: "landing premium imobiliaria com hero cinematic",
      blueprint: { industry: "imobiliaria", experience: "premium" },
      patterns: ["hero-cinematic", "product-showcase"],
    });

    expect(result.palette.length).toBeGreaterThan(0);
    expect(result.motion.toLowerCase()).toMatch(/cinematic|subtle|premium/);
    expect(result.heading.toLowerCase()).toContain("premium");
  });
});
