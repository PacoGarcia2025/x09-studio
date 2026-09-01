import { describe, expect, it, beforeEach } from "vitest";
import { getAiAssetProvider, listAiAssetProviders } from "@/lib/ai-engine/providers";
import { getDefaultAiAssetProviderId } from "@/lib/ai-engine/config";
import { resetCapabilityProvidersForTests } from "@/lib/capability-router/register";
import { createLocalCapabilityProvider } from "@/lib/capability-router/providers/local";
import { isAiGenerationEnabled } from "@/lib/ai-engine/config";

describe("AI catalog via Capability Router", () => {
  beforeEach(() => {
    resetCapabilityProvidersForTests([createLocalCapabilityProvider()]);
  });

  it("lista só providers registrados — sem motores nomeados", () => {
    const ids = listAiAssetProviders().map((p) => p.id);
    expect(ids).toEqual(["local-assets"]);
    expect(ids.join(" ")).not.toMatch(/trellis|hunyuan|triposr/i);
  });

  it("default é local-assets", () => {
    expect(getDefaultAiAssetProviderId()).toBe("local-assets");
    expect(getAiAssetProvider().id).toBe("local-assets");
    expect(getAiAssetProvider().requiresGpu).toBe(false);
  });

  it("geração permanece desligada por padrão", () => {
    const previous = process.env.STUDIO_AI_ENGINE_GENERATION_ENABLED;
    delete process.env.STUDIO_AI_ENGINE_GENERATION_ENABLED;
    expect(isAiGenerationEnabled()).toBe(false);
    if (previous === undefined) {
      delete process.env.STUDIO_AI_ENGINE_GENERATION_ENABLED;
    } else {
      process.env.STUDIO_AI_ENGINE_GENERATION_ENABLED = previous;
    }
  });
});
