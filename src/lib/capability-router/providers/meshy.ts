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
  meshyCreateBodyForTier,
  meshyRetextureBody,
  meshyTextPreviewBody,
  meshyTextRefineBody,
  pollMeshyTask,
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
  const timeoutMs = options?.timeoutMs ?? 720_000;
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
  const task = await pollMeshyTask({
    apiKey: opts.apiKey!,
    taskId: created.id,
    timeoutMs: opts.timeoutMs,
    http: opts.http,
  });
  if ("error" in task) {
    return { status: "failed", message: task.error };
  }
  return writeSucceededGlb(ctx, opts, task, {
    meshTier: tier,
    commercialTaskId: created.id,
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

  const preview = await createMeshyTask({
    apiKey: opts.apiKey!,
    url: TEXT_TO_3D_URL,
    body: meshyTextPreviewBody(tier, prompt),
    http: opts.http,
  });
  if ("error" in preview) {
    return { status: "failed", message: preview.error };
  }
  const previewTask = await pollMeshyTask({
    apiKey: opts.apiKey!,
    taskId: preview.id,
    pollUrl: `${TEXT_TO_3D_URL}/${preview.id}`,
    timeoutMs: opts.timeoutMs,
    http: opts.http,
  });
  if ("error" in previewTask) {
    return { status: "failed", message: previewTask.error };
  }

  const refine = await createMeshyTask({
    apiKey: opts.apiKey!,
    url: TEXT_TO_3D_URL,
    body: meshyTextRefineBody(preview.id, tier),
    http: opts.http,
  });
  if ("error" in refine) {
    return { status: "failed", message: refine.error };
  }
  const refineTask = await pollMeshyTask({
    apiKey: opts.apiKey!,
    taskId: refine.id,
    pollUrl: `${TEXT_TO_3D_URL}/${refine.id}`,
    timeoutMs: opts.timeoutMs,
    http: opts.http,
  });
  if ("error" in refineTask) {
    return { status: "failed", message: refineTask.error };
  }
  return writeSucceededGlb(ctx, opts, refineTask, {
    meshTier: tier,
    commercialTaskId: refine.id,
    previewTaskId: preview.id,
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
  const task = await pollMeshyTask({
    apiKey: opts.apiKey!,
    taskId: created.id,
    pollUrl: `${RETEXTURE_URL}/${created.id}`,
    timeoutMs: opts.timeoutMs,
    http: opts.http,
  });
  if ("error" in task) {
    return { status: "failed", message: task.error };
  }
  return writeSucceededGlb(ctx, opts, task, {
    commercialTaskId: created.id,
    sourceMode: "retexture",
  });
}
