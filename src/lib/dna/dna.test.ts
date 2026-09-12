import { describe, expect, it } from "vitest";
import { detectBusinessIndustry, resolveBusinessDna } from "@/lib/dna/business-dna";
import { detectExperiencePreset, resolveExperienceDna } from "@/lib/dna/experience-dna";
import { resolveBlueprint } from "@/lib/dna/blueprint";

describe("x09 business dna", () => {
  it("detects hamburgueria from a business brief", () => {
    expect(detectBusinessIndustry("Tenho uma hamburgueria e quero sistema completo para pedidos e entregas")).toBe("hamburgueria");
  });

  it("resolves a structured business dna for hamburgueria", () => {
    const dna = resolveBusinessDna("hamburgueria com cardápio, pedidos, clientes e entregas");
    expect(dna.industry).toBe("hamburgueria");
    expect(dna.modules).toContain("cardapio");
    expect(dna.rules.length).toBeGreaterThan(0);
  });
});

describe("x09 experience dna", () => {
  it("detects cinematic experience", () => {
    expect(detectExperiencePreset("quero um site cinematográfico para minha barbearia")).toBe("cinematic");
  });

  it("resolves premium experience for generic prompt", () => {
    const dna = resolveExperienceDna("quero um site premium");
    expect(dna.preset).toBe("luxury");
    expect(dna.visual.palette.length).toBeGreaterThan(0);
  });

  it("adds premium direction guidance for business-specific premium experiences", () => {
    const dna = resolveExperienceDna("hamburgueria premium com foco em conversão e identidade forte");
    expect(dna.preset).toBe("luxury");
    expect(dna.direction.artDirection).toContain("premium");
    expect(dna.direction.antiGeneric).toBeTruthy();
    expect(dna.visual.motion).toMatch(/(subtil|dinam|suave)/i);
  });
});

describe("x09 blueprint", () => {
  it("creates a blueprint for hamburgeria with default premium experience", () => {
    const blueprint = resolveBlueprint(
      "Tenho uma hamburgueria e quero um sistema completo para administrar pedidos, clientes, cardápio e entregas.",
      { hasExistingApp: false },
    );

    expect(blueprint.industry).toBe("hamburgueria");
    expect(blueprint.productType).toBe("application");
    expect(blueprint.experience).toBe("premium");
    expect(blueprint.modules.length).toBeGreaterThan(0);
    expect(blueprint.pages.length).toBeGreaterThan(0);
  });

  it("falls back safely for unknown segment", () => {
    const blueprint = resolveBlueprint("quero um produto para qualquer coisa sem contexto");
    expect(blueprint.industry).toBe("generic");
    expect(blueprint.fallbackUsed).toBe(true);
    expect(blueprint.preserveExistingArchitecture).toBe(true);
  });

  it("preserves existing architecture when an app already exists", () => {
    const blueprint = resolveBlueprint("quero melhorar o cadastro e a gestão do meu sistema atual", {
      hasExistingApp: true,
    });
    expect(blueprint.preserveExistingArchitecture).toBe(true);
  });
});
