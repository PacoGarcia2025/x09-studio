import type { CapabilityProvider } from "@/lib/capability-router/types";

/**
 * Provider local — só ingestão. Sem GPU, sem modelos, sem nomes de motores.
 */
export function createLocalCapabilityProvider(): CapabilityProvider {
  return {
    manifest: {
      id: "local-assets",
      name: "Local",
      version: "1.0.0",
      capabilities: ["asset.ingest"],
      priority: 10,
      status: "ready",
      requiresGpu: false,
      requiresInternet: false,
      enabled: true,
      supportedInputKinds: [
        "mesh",
        "image",
        "audio",
        "video",
        "texture",
        "material",
        "animation",
        "hdri",
        "thumbnail",
        "other",
      ],
    },
    async execute(ctx) {
      if (ctx.capability !== "asset.ingest") {
        return {
          status: "skipped",
          message: `Provider local não cobre ${ctx.capability}`,
        };
      }
      if (!ctx.inputPath) {
        return { status: "failed", message: "Job de ingest sem input_path" };
      }
      const ok = await ctx.storage.exists(ctx.inputPath);
      if (!ok) {
        return { status: "failed", message: "Arquivo ausente no storage" };
      }
      return {
        status: "done",
        outputPath: ctx.inputPath,
        message: "Ingest ok — arquivo presente no storage",
        meta: { capability: ctx.capability, processorTarget: ctx.processorTarget },
      };
    },
  };
}
