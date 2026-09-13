import { describe, expect, it } from "vitest";
import { buildGenerationFlowContext, hasUserAssetConsent } from "./flow-context";
import { evaluateDiscoveryNeeds } from "@/lib/discovery-engine";
import { stockImagesForBrief } from "@/lib/pipeline/visual-tweaks";
import { formatBuilderContext } from "@/lib/pipeline/brief-context";

describe("Architectural Authority Migration (Fases 1-10)", () => {
  it("TESTE 1: Discovery Engine solicita dados faltantes para pedidos vagos", () => {
    const evaluation = evaluateDiscoveryNeeds({
      query: "Crie um site para uma hamburgueria.",
    });

    expect(evaluation.isSufficient).toBe(false);
    expect(evaluation.questions.length).toBeGreaterThan(0);
    expect(evaluation.questions[0]).toContain("nome");
  });

  it("TESTE 2: Pedido de sistema completo obriga productType a NÃO ser landing", () => {
    const flowContext = buildGenerationFlowContext({
      prompt: "Crie um sistema completo para uma hamburgueria com cardápio, pedidos, clientes, entrega e painel administrativo.",
    });

    expect(flowContext.contract.blueprint.productType).not.toBe("landing");
    expect(flowContext.contract.blueprint.productType).toBe("application");
    expect(flowContext.contract.intent.isSystemOrApp).toBe(true);
  });

  it("TESTE 3: O contrato estrutural exige módulos e páginas ricas no blueprint", () => {
    const flowContext = buildGenerationFlowContext({
      prompt: "Crie um sistema completo para uma hamburgueria com cardápio, pedidos, clientes, entrega e painel administrativo.",
    });

    const modules = flowContext.contract.blueprint.requiredModules;
    const pageIds = flowContext.contract.blueprint.requiredPages.map((p) => p.id);

    expect(modules).toContain("cardapio");
    expect(modules).toContain("pedidos");
    expect(pageIds).toContain("cardapio");
    expect(pageIds).toContain("pedidos");
  });

  it("TESTE 4: O contrato estrutural fornece autoridade indiscutível para o Builder", () => {
    const flowContext = buildGenerationFlowContext({
      prompt: "Crie um sistema completo para uma hamburgueria com cardápio e painel admin",
    });

    expect(flowContext.contract.blueprint.productType).toBe("application");
    expect(flowContext.contract.blueprint.requiredPages.length).toBeGreaterThan(1);
    expect(flowContext.contract.blueprint.authRequired).toBe(true);
  });

  it("TESTE 5: Sem autorização explícita, galeria pessoal é DENY BY DEFAULT", () => {
    const prompt = "Crie um sistema completo para uma hamburgueria";
    expect(hasUserAssetConsent(prompt)).toBe(false);

    const flowContext = buildGenerationFlowContext({ prompt });
    expect(flowContext.contract.resources.userAssetPolicy).toBe("DENY_BY_DEFAULT");

    const formattedContext = formatBuilderContext({
      projectName: "Black Burger",
      briefPrompt: prompt,
      libraryCatalog: "Galeria do cliente: /library/logo-1.png",
    });

    expect(formattedContext).not.toContain("/library/logo-1.png");
  });

  it("TESTE 6: Com autorização explícita, galeria pessoal é EXPLICIT_USER_CONSENT_GRANTED", () => {
    const prompt = "Crie um site para hamburgueria usando a minha foto da galeria";
    expect(hasUserAssetConsent(prompt)).toBe(true);

    const flowContext = buildGenerationFlowContext({ prompt });
    expect(flowContext.contract.resources.userAssetPolicy).toBe("EXPLICIT_USER_CONSENT_GRANTED");

    const formattedContext = formatBuilderContext({
      projectName: "Black Burger",
      briefPrompt: prompt,
      libraryCatalog: "Galeria do cliente: /library/logo-1.png",
    });

    expect(formattedContext).toContain("/library/logo-1.png");
  });

  it("TESTE 7: Hamburgueria não seleciona automaticamente recursos incompatíveis de game ou 3D", () => {
    const flowContext = buildGenerationFlowContext({
      prompt: "Crie um sistema completo para uma hamburgueria",
    });

    const hasGameOr3d = flowContext.selectedResources.some(
      (r) => r.kind === "game_asset" || r.kind === "3d" || r.id.includes("kenney") || r.id.includes("poly-haven"),
    );

    expect(hasGameOr3d).toBe(false);

    const stockImages = stockImagesForBrief("hamburgueria gourmet");
    expect(stockImages[0]).toContain("unsplash");
    expect(stockImages[0]).not.toContain("photo-1613490493576"); // não é imobiliária
  });

  it("TESTE 8: Experience Composition influencia diretamente o GenerationContract", () => {
    const flowContext = buildGenerationFlowContext({
      prompt: "Crie um sistema de hamburgueria cinematográfica de luxo com narrativa visual",
    });

    expect(flowContext.contract.composition.summary).toContain("hamburgueria");
    expect(flowContext.contract.composition.patterns).toContain("hero-cinematic");
    expect(flowContext.contract.composition.sections.length).toBeGreaterThan(0);
  });
});
