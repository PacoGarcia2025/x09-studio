import fs from "node:fs/promises";
import path from "node:path";
import { isCommercialMeshTier } from "@/lib/assets/mesh-tiers";
import type { CapabilityProvider } from "@/lib/capability-router/types";
import type { ExecutionContext, ProviderResult } from "@/lib/capability-router/types";
import {
  acquireRunpodGpu,
  isRunpodOnDemandConfigured,
  releaseRunpodGpu,
  type RunpodSshTarget,
} from "@/lib/capability-router/providers/runpod-pod";
import { runTrellisOnRunpod } from "@/lib/capability-router/providers/trellis-remote";
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
  return Boolean(resolveTrellisPython()) || isRunpodOnDemandConfigured();
}

export type TrellisRunFn = (input: {
  python: string;
  script: string;
  inputFile: string;
  outputFile: string;
  trellisRoot: string | null;
  timeoutMs: number;
}) => Promise<TrellisSidecarResult>;

export type TrellisGpuLease = {
  configured: () => boolean;
  acquire: () => Promise<RunpodSshTarget>;
  release: () => Promise<void>;
};

export type TrellisRemoteRunFn = (input: {
  session: RunpodSshTarget;
  script: string;
  inputFile: string;
  outputFile: string;
  trellisRoot: string | null;
  timeoutMs: number;
}) => Promise<TrellisSidecarResult>;

const defaultGpu: TrellisGpuLease = {
  configured: () => isRunpodOnDemandConfigured(),
  acquire: () => acquireRunpodGpu(),
  release: () => releaseRunpodGpu(),
};

/**
 * Provider TRELLIS (image → GLB). Adapta-se ao Core: só ExecutionContext + storage.
 * fake-mesh permanece fallback quando GPU está desligada.
 * Com STUDIO_RUNPOD_POD_ID + API key, sobe o pod no pedido e faz STOP no finally.
 */
export function createTrellisProvider(options?: {
  run?: TrellisRunFn;
  gpu?: TrellisGpuLease;
  remoteRun?: TrellisRemoteRunFn;
}): CapabilityProvider {
  const run = options?.run ?? runTrellisSidecar;
  const gpu = options?.gpu ?? defaultGpu;
  const remoteRun = options?.remoteRun ?? runTrellisOnRunpod;

  return {
    manifest: {
      id: "trellis",
      name: "TRELLIS",
      version: "0.4.0",
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
      return executeTrellis(ctx, run, gpu, remoteRun);
    },
  };
}

async function executeTrellis(
  ctx: ExecutionContext,
  run: TrellisRunFn,
  gpu: TrellisGpuLease,
  remoteRun: TrellisRemoteRunFn,
): Promise<ProviderResult> {
  if (ctx.capability !== "mesh.generate") {
    return {
      status: "skipped",
      message: `TRELLIS não cobre ${ctx.capability}`,
    };
  }
  if (isCommercialMeshTier(ctx.params.meshTier)) {
    return {
      status: "skipped",
      message: "Job comercial — outro provider",
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

  const onDemand = gpu.configured();
  const python = resolveTrellisPython() ?? (onDemand ? "python" : null);
  if (!python) {
    return {
      status: "failed",
      message:
        "Sidecar TRELLIS não configurado (STUDIO_TRELLIS_PYTHON) nem GPU RunPod sob demanda.",
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

      const result = await runSidecar({
        python,
        script,
        inputFile,
        outputFile,
        trellisRoot: onDemand
          ? resolveTrellisRoot() || "/workspace/TRELLIS"
          : resolveTrellisRoot(),
        timeoutMs: trellisTimeoutMs(),
        gpu,
        remoteRun,
        localRun: run,
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

async function runSidecar(input: {
  python: string;
  script: string;
  inputFile: string;
  outputFile: string;
  trellisRoot: string | null;
  timeoutMs: number;
  gpu: TrellisGpuLease;
  remoteRun: TrellisRemoteRunFn;
  localRun: TrellisRunFn;
}): Promise<TrellisSidecarResult> {
  if (!input.gpu.configured()) {
    return input.localRun(input);
  }
  const session = await input.gpu.acquire();
  try {
    return await input.remoteRun({
      session,
      script: input.script,
      inputFile: input.inputFile,
      outputFile: input.outputFile,
      trellisRoot: input.trellisRoot,
      timeoutMs: input.timeoutMs,
    });
  } finally {
    await input.gpu.release();
  }
}


