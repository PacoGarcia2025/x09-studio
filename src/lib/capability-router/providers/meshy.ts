import type { CapabilityProvider } from "@/lib/capability-router/types";
import type { ExecutionContext, ProviderResult } from "@/lib/capability-router/types";
import { isCommercialMeshTier, parseMeshTier } from "@/lib/assets/mesh-tiers";
import { isGlbMagic } from "@/lib/capability-router/providers/fake-mesh-glb";
import { imageMime } from "@/lib/capability-router/providers/logo-plate-glb";
import {
  meshyApiKeyFromEnv,
} from "@/lib/capability-router/providers/meshy-env";
import {
  createMeshyImageTo3dTask,
  createMeshyTask,
  downloadMeshyGlb,
  getMeshyTask,
  IMAGE_TO_3D_URL,
  meshyCreateBodyForTier,
  meshyRetextureBody,
  meshyTextPreviewBody,
  meshyTextRefineBody,
  RETEXTURE_URL,
  TEXT_TO_3D_URL,
  toGlbDataUri,
  toImageDataUri,
  type MeshyHttp,
  type MeshyTask,
} from "@/lib/capability-router/providers/meshy-api";

export {
  isCommercialMeshConfigured,
  meshyApiKeyFromEnv,
} from "@/lib/capability-router/providers/meshy-env";

type MeshyOpts = { http?: MeshyHttp; apiKey: string | null; timeoutMs: number };

/**
 * Provider comercial: image/texto → GLB e retextura. Só corre em jobs pagos.
 * O Core não referencia este arquivo.
 */
export function createMeshyProvider(options?: {
  http?: MeshyHttp;
  apiKey?: string | null;
  timeoutMs?: number;
}): CapabilityProvider {
  const timeoutMs = options?.timeoutMs ?? 1_200_000;
  return {
    manifest: {
      id: "commercial-mesh",
      name: "Commercial mesh",
      version: "1.1.0",
      capabilities: ["mesh.generate", "texture.generate"],
      priority: 75,
      status: "ready",
      requiresGpu: false,
      requiresInternet: true,
      requiresPaidApi: true,
      enabled: true,
      supportedInputKinds: ["image", "mesh"],
      supportedOutputKinds: ["mesh"],
    },
    async execute(ctx) {
      return executeMeshy(ctx, {
        http: options?.http,
        apiKey: options?.apiKey ?? meshyApiKeyFromEnv(),
        timeoutMs,
      });
    },
  };
}

function gateCommercial(
  ctx: ExecutionContext,
  opts: MeshyOpts,
): ProviderResult | null {
  if (!ctx.policies.paidApisAllowed) {
    return {
      status: "failed",
      message: "APIs pagas desligadas (STUDIO_ASSET_PAID_APIS).",
    };
  }
  if (!opts.apiKey) {
    return {
      status: "failed",
      message: "Geração comercial não configurada.",
    };
  }
  if (!ctx.outputPath) {
    return { status: "failed", message: "Job comercial sem output_path" };
  }
  return null;
}

async function writeSucceededGlb(
  ctx: ExecutionContext,
  opts: MeshyOpts,
  task: MeshyTask,
  extra: Record<string, unknown>,
): Promise<ProviderResult> {
  const glbUrl = task.model_urls?.glb;
  if (!glbUrl) {
    return { status: "failed", message: "Tarefa concluída sem URL de GLB" };
  }
  const glb = await downloadMeshyGlb({ url: glbUrl, http: opts.http });
  if ("error" in glb) {
    return { status: "failed", message: glb.error };
  }
  if (!isGlbMagic(glb)) {
    return { status: "failed", message: "Arquivo devolvido não é um GLB" };
  }
  await ctx.storage.writeFile(ctx.outputPath!, glb);
  return {
    status: "done",
    outputPath: ctx.outputPath,
    message: `Malha comercial gravada (${glb.byteLength} bytes)`,
    meta: {
      capability: ctx.capability,
      byteSize: glb.byteLength,
      consumedUpstreamCredits: task.consumed_credits ?? null,
      ...extra,
    },
  };
}

async function executeMeshy(
  ctx: ExecutionContext,
  opts: MeshyOpts,
): Promise<ProviderResult> {
  if (ctx.capability === "texture.generate") {
    return executeRetexture(ctx, opts);
  }
  if (ctx.capability !== "mesh.generate") {
    return {
      status: "skipped",
      message: `Malha comercial não cobre ${ctx.capability}`,
    };
  }
  if (!isCommercialMeshTier(ctx.params.meshTier)) {
    return {
      status: "skipped",
      message: "Job GPU/local — outro provider",
    };
  }
  const prompt =
    typeof ctx.params.prompt === "string" ? ctx.params.prompt.trim() : "";
  if (prompt) {
    return executeTextTo3d(ctx, opts, prompt);
  }
  return executeImageTo3d(ctx, opts);
}

function stringParam(
  params: Record<string, unknown>,
  key: string,
): string | null {
  const value = params[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberParam(
  params: Record<string, unknown>,
  key: string,
): number | null {
  const value = params[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function deadlineMs(ctx: ExecutionContext, timeoutMs: number): number {
  return numberParam(ctx.params, "commercialDeadlineMs") ?? Date.now() + timeoutMs;
}

function waitingResult(
  ctx: ExecutionContext,
  opts: MeshyOpts,
  extra: Record<string, unknown>,
  progress?: number,
): ProviderResult {
  const pct =
    typeof progress === "number" && progress > 0
      ? ` (${Math.round(progress)}%)`
      : "";
  return {
    status: "waiting",
    message: `A gerar o objeto 3D${pct}. Pode levar alguns minutos.`,
    meta: {
      commercialDeadlineMs: deadlineMs(ctx, opts.timeoutMs),
      ...extra,
    },
  };
}

async function inspectMeshyTask(input: {
  apiKey: string;
  taskId: string;
  pollUrl: string;
  http?: MeshyHttp;
}): Promise<
  | { status: "waiting"; task: MeshyTask }
  | { status: "succeeded"; task: MeshyTask }
  | { error: string }
> {
  const task = await getMeshyTask({
    apiKey: input.apiKey,
    url: input.pollUrl,
    http: input.http,
  });
  if ("error" in task) return task;
  if (task.status === "SUCCEEDED") return { status: "succeeded", task };
  if (task.status === "FAILED" || task.status === "CANCELED") {
    const msg = task.task_error?.message?.trim() || "Geração comercial falhou";
    return { error: msg.slice(0, 400) };
  }
  return { status: "waiting", task };
}

async function executeImageTo3d(
  ctx: ExecutionContext,
  opts: MeshyOpts,
): Promise<ProviderResult> {
  const blocked = gateCommercial(ctx, opts);
  if (blocked) return blocked;
  const tier = parseMeshTier(ctx.params.meshTier);
  if (tier !== "game" && tier !== "flagship") {
    return { status: "skipped", message: "Tier comercial inválido" };
  }
  if (Date.now() > deadlineMs(ctx, opts.timeoutMs)) {
    return { status: "failed", message: "Tempo esgotado à espera da geração comercial" };
  }

  let taskId = stringParam(ctx.params, "commercialTaskId");
  if (!taskId) {
    if (!ctx.inputPath) {
      return {
        status: "failed",
        message: "Geração comercial a partir de imagem exige input_path",
      };
    }
    const exists = await ctx.storage.exists(ctx.inputPath);
    if (!exists) {
      return { status: "failed", message: "Arquivo de entrada ausente no storage" };
    }
    const imageBytes = await ctx.storage.readFile(ctx.inputPath);
    const mime = imageMime(imageBytes);
    if (!mime) {
      return { status: "failed", message: "Geração comercial exige PNG ou JPEG" };
    }

    const created = await createMeshyImageTo3dTask({
      apiKey: opts.apiKey!,
      body: meshyCreateBodyForTier(tier, toImageDataUri(imageBytes, mime)),
      http: opts.http,
    });
    if ("error" in created) {
      return { status: "failed", message: created.error };
    }
    taskId = created.id;
  }

  const inspected = await inspectMeshyTask({
    apiKey: opts.apiKey!,
    taskId,
    pollUrl: `${IMAGE_TO_3D_URL}/${taskId}`,
    http: opts.http,
  });
  if ("error" in inspected) {
    return { status: "failed", message: inspected.error };
  }
  if (inspected.status === "waiting") {
    return waitingResult(
      ctx,
      opts,
      {
        commercialTaskId: taskId,
        commercialPhase: "image",
        meshTier: tier,
        sourceMode: "image",
      },
      inspected.task.progress,
    );
  }
  return writeSucceededGlb(ctx, opts, inspected.task, {
    meshTier: tier,
    commercialTaskId: taskId,
    sourceMode: "image",
  });
}

async function executeTextTo3d(
  ctx: ExecutionContext,
  opts: MeshyOpts,
  prompt: string,
): Promise<ProviderResult> {
  const blocked = gateCommercial(ctx, opts);
  if (blocked) return blocked;
  const tier = parseMeshTier(ctx.params.meshTier);
  if (tier !== "game" && tier !== "flagship") {
    return { status: "skipped", message: "Tier comercial inválido" };
  }
  if (Date.now() > deadlineMs(ctx, opts.timeoutMs)) {
    return { status: "failed", message: "Tempo esgotado à espera da geração comercial" };
  }

  const phase = stringParam(ctx.params, "commercialPhase");
  let previewId = stringParam(ctx.params, "previewTaskId");
  let taskId = stringParam(ctx.params, "commercialTaskId");

  if (phase !== "refine") {
    if (!previewId) {
      const preview = await createMeshyTask({
        apiKey: opts.apiKey!,
        url: TEXT_TO_3D_URL,
        body: meshyTextPreviewBody(tier, prompt),
        http: opts.http,
      });
      if ("error" in preview) {
        return { status: "failed", message: preview.error };
      }
      previewId = preview.id;
      taskId = preview.id;
    }

    const previewInspected = await inspectMeshyTask({
      apiKey: opts.apiKey!,
      taskId: previewId,
      pollUrl: `${TEXT_TO_3D_URL}/${previewId}`,
      http: opts.http,
    });
    if ("error" in previewInspected) {
      return { status: "failed", message: previewInspected.error };
    }
    if (previewInspected.status === "waiting") {
      return waitingResult(
        ctx,
        opts,
        {
          commercialTaskId: previewId,
          previewTaskId: previewId,
          commercialPhase: "preview",
          meshTier: tier,
          sourceMode: "text",
        },
        previewInspected.task.progress,
      );
    }

    const refine = await createMeshyTask({
      apiKey: opts.apiKey!,
      url: TEXT_TO_3D_URL,
      body: meshyTextRefineBody(previewId, tier),
      http: opts.http,
    });
    if ("error" in refine) {
      return { status: "failed", message: refine.error };
    }
    taskId = refine.id;
  }

  if (!taskId) {
    return { status: "failed", message: "Tarefa comercial sem id" };
  }

  const refineInspected = await inspectMeshyTask({
    apiKey: opts.apiKey!,
    taskId,
    pollUrl: `${TEXT_TO_3D_URL}/${taskId}`,
    http: opts.http,
  });
  if ("error" in refineInspected) {
    return { status: "failed", message: refineInspected.error };
  }
  if (refineInspected.status === "waiting") {
    return waitingResult(
      ctx,
      opts,
      {
        commercialTaskId: taskId,
        previewTaskId: previewId,
        commercialPhase: "refine",
        meshTier: tier,
        sourceMode: "text",
      },
      refineInspected.task.progress,
    );
  }
  return writeSucceededGlb(ctx, opts, refineInspected.task, {
    meshTier: tier,
    commercialTaskId: taskId,
    previewTaskId: previewId,
    sourceMode: "text",
  });
}

async function executeRetexture(
  ctx: ExecutionContext,
  opts: MeshyOpts,
): Promise<ProviderResult> {
  const blocked = gateCommercial(ctx, opts);
  if (blocked) return blocked;
  const prompt =
    typeof ctx.params.prompt === "string" ? ctx.params.prompt.trim() : "";
  if (!prompt) {
    return { status: "failed", message: "Retextura exige um prompt de estilo" };
  }
  if (Date.now() > deadlineMs(ctx, opts.timeoutMs)) {
    return { status: "failed", message: "Tempo esgotado à espera da geração comercial" };
  }

  let taskId = stringParam(ctx.params, "commercialTaskId");
  if (!taskId) {
    if (!ctx.inputPath) {
      return { status: "failed", message: "Retextura exige um GLB de origem" };
    }
    const exists = await ctx.storage.exists(ctx.inputPath);
    if (!exists) {
      return { status: "failed", message: "Arquivo de origem ausente no storage" };
    }
    const glbBytes = await ctx.storage.readFile(ctx.inputPath);
    if (!isGlbMagic(glbBytes)) {
      return { status: "failed", message: "Origem da retextura não é um GLB" };
    }

    const created = await createMeshyTask({
      apiKey: opts.apiKey!,
      url: RETEXTURE_URL,
      body: meshyRetextureBody(toGlbDataUri(glbBytes), prompt),
      http: opts.http,
    });
    if ("error" in created) {
      return { status: "failed", message: created.error };
    }
    taskId = created.id;
  }

  const inspected = await inspectMeshyTask({
    apiKey: opts.apiKey!,
    taskId,
    pollUrl: `${RETEXTURE_URL}/${taskId}`,
    http: opts.http,
  });
  if ("error" in inspected) {
    return { status: "failed", message: inspected.error };
  }
  if (inspected.status === "waiting") {
    return waitingResult(
      ctx,
      opts,
      {
        commercialTaskId: taskId,
        commercialPhase: "retexture",
        sourceMode: "retexture",
      },
      inspected.task.progress,
    );
  }
  return writeSucceededGlb(ctx, opts, inspected.task, {
    commercialTaskId: taskId,
    sourceMode: "retexture",
  });
}
