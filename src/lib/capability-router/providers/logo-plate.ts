import type { CapabilityProvider } from "@/lib/capability-router/types";
import type { ExecutionContext, ProviderResult } from "@/lib/capability-router/types";
import {
  buildLogoPlateGlb,
  imageMime,
} from "@/lib/capability-router/providers/logo-plate-glb";
import { clampLogoThickness } from "@/lib/capability-router/providers/logo-plate-thickness";
import { isGlbMagic } from "@/lib/capability-router/providers/fake-mesh-glb";

/**
 * Placa 3D com a imagem original como textura.
 * Cobre logótipos: o TRELLIS (mesh.generate) não preserva texto nítido.
 */
export function createLogoPlateProvider(): CapabilityProvider {
  return {
    manifest: {
      id: "logo-plate",
      name: "Logo plate",
      version: "1.0.0",
      capabilities: ["mesh.logo"],
      priority: 50,
      status: "ready",
      requiresGpu: false,
      requiresInternet: false,
      enabled: true,
      supportedInputKinds: ["image"],
      supportedOutputKinds: ["mesh"],
    },
    async execute(ctx) {
      return executeLogoPlate(ctx);
    },
  };
}

async function executeLogoPlate(ctx: ExecutionContext): Promise<ProviderResult> {
  if (ctx.capability !== "mesh.logo") {
    return { status: "skipped", message: `Logo plate não cobre ${ctx.capability}` };
  }
  if (!ctx.outputPath) {
    return { status: "failed", message: "Job de mesh.logo sem output_path" };
  }
  if (!ctx.inputPath) {
    return {
      status: "failed",
      message: "Logo exige imagem de entrada (input_path)",
    };
  }

  const ok = await ctx.storage.exists(ctx.inputPath);
  if (!ok) {
    return { status: "failed", message: "Arquivo de entrada ausente no storage" };
  }

  const imageBytes = await ctx.storage.readFile(ctx.inputPath);
  if (!imageMime(imageBytes)) {
    return { status: "failed", message: "Logo exige PNG ou JPEG" };
  }

  const thickness = clampLogoThickness(ctx.params.thickness);
  const glb = buildLogoPlateGlb(imageBytes, { thickness });
  if (!isGlbMagic(glb)) {
    return { status: "failed", message: "Falha ao montar o GLB do logo" };
  }

  await ctx.storage.writeFile(ctx.outputPath, glb);
  return {
    status: "done",
    outputPath: ctx.outputPath,
    message: `Placa de logo gravada (${glb.byteLength} bytes)`,
    meta: {
      capability: ctx.capability,
      provider: "logo-plate",
      byteSize: glb.byteLength,
      thickness,
    },
  };
}
