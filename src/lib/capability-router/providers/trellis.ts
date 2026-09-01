import fs from "node:fs/promises";
import path from "node:path";
import type { CapabilityProvider } from "@/lib/capability-router/types";
import type { ExecutionContext, ProviderResult } from "@/lib/capability-router/types";
import {
  inputExtension,
  isGlbMagic,
  resolveTrellisPython,
  resolveTrellisRoot,
  resolveTrellisScript,
  runTrellisSidecar,
  trellisTimeoutMs,
  withTrellisTempDir,
  type TrellisSidecarResult,
} from "@/lib/capability-router/providers/trellis-run";

export function isTrellisSidecarConfigured(): boolean {
  return Boolean(resolveTrellisPython());
}

export type TrellisRunFn = (input: {
  python: string;
  script: string;
  inputFile: string;
  outputFile: string;
  trellisRoot: string | null;
  timeoutMs: number;
}) => Promise<TrellisSidecarResult>;

/**
 * Provider TRELLIS (image → GLB). Adapta-se ao Core: só ExecutionContext + storage.
 * fake-mesh permanece fallback quando GPU está desligada.
 */
export function createTrellisProvider(options?: {
  run?: TrellisRunFn;
}): CapabilityProvider {
  const run = options?.run ?? runTrellisSidecar;

  return {
    manifest: {
      id: "trellis",
      name: "TRELLIS",
      version: "0.3.0",
      capabilities: ["mesh.generate"],
      priority: 80,
      status: "ready",
      requiresGpu: true,
      requiresInternet: false,
      enabled: true,
      supportedInputKinds: ["image"],
      supportedOutputKinds: ["mesh"],
    },
    async execute(ctx) {
      return executeTrellis(ctx, run);
    },
  };
}

async function executeTrellis(
  ctx: ExecutionContext,
  run: TrellisRunFn,
): Promise<ProviderResult> {
  if (ctx.capability !== "mesh.generate") {
    return {
      status: "skipped",
      message: `TRELLIS não cobre ${ctx.capability}`,
    };
  }
  if (!ctx.policies.gpuAvailable) {
    return {
      status: "failed",
      message: "GPU indisponível (STUDIO_ASSET_GPU_AVAILABLE). fake-mesh continua o fallback.",
    };
  }
  if (!ctx.outputPath) {
    return {
      status: "failed",
      message: "Job de mesh.generate sem output_path",
    };
  }
  if (!ctx.inputPath) {
    return {
      status: "failed",
      message: "TRELLIS exige imagem de entrada (input_path)",
    };
  }

  const python = resolveTrellisPython();
  if (!python) {
    return {
      status: "failed",
      message:
        "Sidecar TRELLIS não configurado (STUDIO_TRELLIS_PYTHON). O Core não foi alterado.",
    };
  }

  const script = resolveTrellisScript();
  try {
    await fs.access(script);
  } catch {
    return {
      status: "failed",
      message: `Script do sidecar ausente (${script}).`,
    };
  }

  const inputOk = await ctx.storage.exists(ctx.inputPath);
  if (!inputOk) {
    return {
      status: "failed",
      message: "Arquivo de entrada ausente no storage",
    };
  }

  const imageBytes = await ctx.storage.readFile(ctx.inputPath);
  const ext = inputExtension(ctx.inputPath);
  if (imageBytes.byteLength < 32) {
    return {
      status: "failed",
      message: "Imagem de entrada vazia ou inválida",
    };
  }

  const started = Date.now();
  try {
    const { glb, metrics } = await withTrellisTempDir(ctx.jobId, async (dir) => {
      const inputFile = path.join(dir, `input.${ext}`);
      const outputFile = path.join(dir, "output.glb");
      await fs.writeFile(inputFile, imageBytes);

      const result = await run({
        python,
        script,
        inputFile,
        outputFile,
        trellisRoot: resolveTrellisRoot(),
        timeoutMs: trellisTimeoutMs(),
      });
      if (!result.ok) {
        throw Object.assign(new Error(result.message), {
          trellisFailed: true,
          metrics: result.metrics,
        });
      }

      const out = await fs.readFile(outputFile);
      if (!isGlbMagic(out)) {
        throw Object.assign(new Error("Sidecar TRELLIS não devolveu um GLB válido."), {
          trellisFailed: true,
        });
      }
      return { glb: out, metrics: result.metrics };
    });

    const elapsedMs = Date.now() - started;
    await ctx.storage.writeFile(ctx.outputPath, glb);
    return {
      status: "done",
      outputPath: ctx.outputPath,
      message: `TRELLIS gravou o GLB (${glb.byteLength} bytes, ${elapsedMs}ms)`,
      meta: {
        capability: ctx.capability,
        provider: "trellis",
        byteSize: glb.byteLength,
        elapsedMs,
        ...metrics,
      },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha no Provider TRELLIS";
    const metrics =
      err && typeof err === "object" && "metrics" in err
        ? (err as { metrics?: Record<string, unknown> }).metrics
        : undefined;
    return {
      status: "failed",
      message: message.slice(0, 500),
      meta: {
        capability: ctx.capability,
        provider: "trellis",
        elapsedMs: Date.now() - started,
        ...metrics,
      },
    };
  }
}
