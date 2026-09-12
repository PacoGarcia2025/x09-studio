import { describe, expect, it } from "vitest";
import { CREATIVE_PATTERN_LIBRARY, formatCreativePatternsForPrompt, selectCreativePatterns } from "@/lib/creative-patterns";

describe("creative pattern library", () => {
  it("exposes a small and reusable pattern catalog", () => {
    expect(CREATIVE_PATTERN_LIBRARY.length).toBeLessThanOrEqual(8);
    expect(CREATIVE_PATTERN_LIBRARY[0]).toHaveProperty("id");
    expect(CREATIVE_PATTERN_LIBRARY[0]).toHaveProperty("category");
  });

  it("selects a compact set based on business dna and experience dna", () => {
    const selected = selectCreativePatterns({
      businessDna: {
        industry: "imobiliaria",
        businessType: "portal imobiliário",
        audience: ["compradores", "investidores"],
        goals: ["vender imóveis", "gerar leads"],
        modules: ["catalogo", "detalhes", "contato"],
        entities: ["imovel", "localizacao"],
        workflows: ["lead capture"],
        integrations: ["whatsapp"],
        uxPatterns: ["hero", "cta"],
        visualPatterns: ["cinematic"],
        rules: ["alta conversão"],
        source: "heuristic",
        confidence: 0.8,
      },
      experienceDna: {
        preset: "cinematic",
        summary: "cinematic premium",
        visual: {
          tone: "cinematic",
          palette: ["#0f172a", "#f59e0b"],
          typography: "grandes headlines",
          density: "media",
          motion: "elegante",
        },
        interaction: {
          microInteractions: true,
          storytelling: true,
          conversionFocus: true,
          accessibility: true,
        },
        direction: {
          artDirection: "cinematic",
          storytelling: "narrative",
          interaction: "smooth",
          conversion: "cta strong",
          antiGeneric: true,
          brandSignal: "premium",
        },
        navigation: ["hero", "story", "cta"],
        source: "heuristic",
        confidence: 0.8,
      },
      blueprint: {
        industry: "imobiliaria",
        productType: "website",
        experience: "cinematic",
        summary: "site imobiliário premium",
        modules: ["catalogo", "lead capture", "contato"],
        pages: [
          { id: "home", title: "Home", route: "/", purpose: "lead capture" },
          { id: "listings", title: "Listings", route: "/imoveis", purpose: "catalogo" },
        ],
        entities: ["imovel"],
        workflows: ["lead capture"],
        integrations: ["whatsapp"],
        ux: {
          tone: "cinematic",
          conversionFocus: true,
          mobileFirst: true,
          accessibility: true,
        },
        visual: {
          palette: ["#0f172a", "#f59e0b"],
          typography: "headline strong",
          motion: "subtle hover",
        },
        technical: {
          stack: ["react"],
          authRequired: false,
          persistence: ["local"],
        },
        priorities: ["hero", "cta"],
        constraints: [],
        preserveExistingArchitecture: true,
        fallbackUsed: false,
        source: "heuristic",
        confidence: 0.8,
      },
      taskContext: "criar home com hero cinematográfico, cards de imóveis, CTA de agendamento e prova social",
      maxPatterns: 3,
    });

    expect(selected.length).toBeLessThanOrEqual(3);
    expect(selected.some((pattern) => pattern.id === "hero-cinematic")).toBe(true);
    expect(selected.some((pattern) => pattern.id === "product-showcase")).toBe(true);
    expect(new Set(selected.map((pattern) => pattern.category)).size).toBeGreaterThan(1);
  });

  it("serializes only the relevant patterns for prompting", () => {
    const selected = selectCreativePatterns({
      businessDna: {
        industry: "restaurante",
        businessType: "restaurante",
        audience: ["clientes"],
        goals: ["atrair pedidos"],
        modules: ["cardapio", "cta"],
        entities: ["menu"],
        workflows: ["delivery"],
        integrations: [],
        uxPatterns: ["hero"],
        visualPatterns: ["luxury"],
        rules: [],
        source: "heuristic",
        confidence: 0.7,
      },
      experienceDna: {
        preset: "luxury",
        summary: "luxury",
        visual: {
          tone: "luxury",
          palette: ["#f8f4ee", "#c8a96b"],
          typography: "elegante",
          density: "moderada",
          motion: "subtil",
        },
        interaction: {
          microInteractions: true,
          storytelling: true,
          conversionFocus: true,
          accessibility: true,
        },
        direction: {
          artDirection: "luxury premium",
          storytelling: "valor e exclusividade",
          interaction: "sutileza",
          conversion: "cta premium",
          antiGeneric: true,
          brandSignal: "premium",
        },
        navigation: ["hero", "menu", "cta"],
        source: "heuristic",
        confidence: 0.7,
      },
      taskContext: "site de restaurante premium com menu e CTA de reservas",
      maxPatterns: 2,
    });

    const prompt = `=== X09 CREATIVE PATTERNS ===\n${formatCreativePatternsForPrompt(selected)}`;
    expect(prompt).toContain("hero-cinematic");
    expect(prompt).toContain("cta-premium");
    expect(prompt).toContain("PATTERNS CRIATIVOS SELECIONADOS");
    expect(prompt).not.toContain("library");
    expect(selected.length).toBeLessThanOrEqual(2);
  });
});
