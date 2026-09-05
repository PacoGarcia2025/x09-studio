import type { CapabilityProvider } from "@/lib/capability-router/types";
import { isGlbMagic } from "@/lib/capability-router/providers/fake-mesh-glb";
import {
  glbHasIdleMotion,
  injectIdleMotion,
} from "@/lib/capability-router/providers/idle-motion-glb";

export function createIdleMotionProvider(): CapabilityProvider {
  return {
    manifest: {
      id: "idle-motion",
      name: "Idle motion",
      version: "1.0.0",
      capabilities: ["animation.generate"],
      priority: 70,
      status: "ready",
      requiresGpu: false,
      requiresInternet: false,
      enabled: true,
      supportedInputKinds: ["mesh"],
      supportedOutputKinds: ["mesh"],
    },
    async execute(ctx) {
      if (ctx.capability !== "animation.generate") {
        return {
          status: "skipped",
          message: `Idle motion não cobre ${ctx.capability}`,
        };
      }
      if (!ctx.inputPath || !ctx.outputPath) {
        return {
          status: "failed",
          message: "Dar movimento exige um objeto 3D na biblioteca.",
        };
      }
      const exists = await ctx.storage.exists(ctx.inputPath);
      if (!exists) {
        return { status: "failed", message: "GLB de origem ausente no storage" };
      }
      const source = await ctx.storage.readFile(ctx.inputPath);
      if (!isGlbMagic(source)) {
        return { status: "failed", message: "A origem não é um GLB" };
      }
      if (glbHasIdleMotion(source)) {
        return {
          status: "failed",
          message: "Este objeto já se mexe. Baixa o GLB ou gera outro.",
        };
      }
      try {
        const animated = injectIdleMotion(source);
        await ctx.storage.writeFile(ctx.outputPath, animated);
        return {
          status: "done",
          outputPath: ctx.outputPath,
          message: "Movimento em loop gravado no GLB.",
          meta: {
            capability: ctx.capability,
            hasIdleMotion: true,
            byteSize: animated.byteLength,
          },
        };
      } catch (err) {
        return {
          status: "failed",
          message:
            err instanceof Error
              ? err.message.slice(0, 400)
              : "Não foi possível animar este GLB.",
        };
      }
    },
  };
}
