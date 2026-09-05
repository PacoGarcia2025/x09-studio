import { isCommercialMeshTier, parseMeshTier } from "@/lib/assets/mesh-tiers";
import {
  buildFakeMeshGlb,
} from "@/lib/capability-router/providers/fake-mesh-glb";
import type { CapabilityProvider } from "@/lib/capability-router/types";

/**
 * Provider de validação da arquitetura.
 * Cobre mesh.generate sem GPU, pesos ou IA — só escreve um GLB de exemplo.
 */
export function createFakeMeshProvider(): CapabilityProvider {
  return {
    manifest: {
      id: "fake-mesh",
      name: "Fake mesh (exemplo)",
      version: "1.0.0",
      capabilities: ["mesh.generate"],
      priority: 20,
      status: "ready",
      requiresGpu: false,
      requiresInternet: false,
      enabled: true,
      supportedInputKinds: ["image"],
      supportedOutputKinds: ["mesh"],
    },
    async execute(ctx) {
      if (ctx.capability !== "mesh.generate") {
        return {
          status: "skipped",
          message: `Fake mesh não cobre ${ctx.capability}`,
        };
      }
      if (isCommercialMeshTier(ctx.params.meshTier)) {
        return {
          status: "skipped",
          message: "Job comercial — outro provider",
        };
      }
      if (parseMeshTier(ctx.params.meshTier) === "gpu") {
        return {
          status: "skipped",
          message: "Objeto simples exige GPU — o stub de teste não substitui.",
        };
      }
      if (!ctx.outputPath) {
        return {
          status: "failed",
          message: "Job de mesh.generate sem output_path",
        };
      }
      if (ctx.inputPath) {
        const ok = await ctx.storage.exists(ctx.inputPath);
        if (!ok) {
          return {
            status: "failed",
            message: "Arquivo de entrada ausente no storage",
          };
        }
      }

      const glb = buildFakeMeshGlb();
      await ctx.storage.writeFile(ctx.outputPath, glb);

      return {
        status: "done",
        outputPath: ctx.outputPath,
        message: "Mesh de exemplo gravado (stub, sem IA)",
        meta: {
          capability: ctx.capability,
          stub: true,
          byteSize: glb.byteLength,
        },
      };
    },
  };
}
