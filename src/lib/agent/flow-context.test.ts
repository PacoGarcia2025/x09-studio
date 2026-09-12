import { describe, expect, it, vi } from "vitest";
import { buildGenerationFlowContext } from "./flow-context";
import { composeExperience } from "@/lib/experience-composition";
import * as resourceTools from "@/lib/tool-layer/resource-tools";
import * as llmProvider from "@/lib/llm/provider";

describe("generation flow causal integration", () => {
  it("does not execute image tool when the prompt does not need visual imagery", () => {
    const searchComponentSpy = vi.spyOn(resourceTools, "searchComponentTool");
    const searchIconSpy = vi.spyOn(resourceTools, "searchIconTool");
    const searchMotionSpy = vi.spyOn(resourceTools, "searchMotionTool");
    const searchImageSpy = vi.spyOn(resourceTools, "searchImageTool");

    buildGenerationFlowContext({
      prompt: "landing imobiliaria com pricing e faq e conversao premium sem imagens",
    });

    expect(searchComponentSpy).toHaveBeenCalled();
    expect(searchIconSpy).toHaveBeenCalled();
    expect(searchMotionSpy).not.toHaveBeenCalled();
    expect(searchImageSpy).not.toHaveBeenCalled();
  });

  it("executes image search when the request requires imagery", () => {
    const searchImageSpy = vi.spyOn(resourceTools, "searchImageTool");

    buildGenerationFlowContext({
      prompt: "landing imobiliaria premium com hero e galeria de fotos dos imóveis",
    });

    expect(searchImageSpy).toHaveBeenCalled();
  });

  it("passes selected resources into the experience composition", () => {
    const context = buildGenerationFlowContext({
      prompt: "landing premium com hero e galeria de imagens do produto",
    });

    expect(context.selectedResources.length).toBeGreaterThan(0);
    expect(JSON.stringify(context.experienceComposition)).toContain(context.selectedResources[0].name);
    expect(context.experienceComposition.resourceSummary?.selectedResourceNames).toContain(context.selectedResources[0].name);
  });

  it("lets creative direction directly influence composition", () => {
    const result = composeExperience({
      prompt: "landing premium cinema",
      blueprint: {
        industry: "imobiliaria",
        productType: "application",
        experience: "premium",
        modules: ["hero", "showcase"],
      },
      patterns: ["hero-cinematic"],
      resources: [{ id: "hero-photo", kind: "image", name: "hero-photo" }],
      creativeDirection: {
        heading: "Luxury editorial",
        palette: ["#0b1220", "#d4af37"],
        motion: "cinematic",
        copy: "Narrativa premium",
      },
    });

    expect(result.summary.toLowerCase()).toContain("cinematic");
    expect(result.sections[0]?.visualTone.toLowerCase()).toContain("cinematic");
  });

  it("keeps the full causal chain available to the planner", () => {
    const context = buildGenerationFlowContext({
      prompt: "landing premium imobiliaria com hero e showcase",
    });

    expect(context.projectBrief).toBeTruthy();
    expect(context.businessDna).toBeUndefined();
    expect(context.experienceDna).toBeTruthy();
    expect(context.blueprint).toBeTruthy();
    expect(context.resourceDecision).toBeTruthy();
    expect(context.selectedResources).toBeTruthy();
    expect(context.creativeDirection).toBeTruthy();
    expect(context.experienceComposition).toBeTruthy();
  });

  it("does not add an LLM call in the flow-context layer", () => {
    const providerSpy = vi.spyOn(llmProvider, "getProviderForMode");

    buildGenerationFlowContext({
      prompt: "landing premium com conversao",
    });

    expect(providerSpy).not.toHaveBeenCalled();
  });
});
