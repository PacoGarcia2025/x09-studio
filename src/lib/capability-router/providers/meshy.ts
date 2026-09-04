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
  pickRiggedGlbUrl,
  pickAnimationGlbUrl,
  RETEXTURE_URL,
  RIGGING_URL,
  ANIMATION_URL,
  GAME_CLIP_ACTIONS,
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
  if (
    stringParam(ctx.params, "commercialPhase") === "animate"
  ) {
    return executeGameClips(ctx, opts);
  }
  if (
    stringParam(ctx.params, "sourceMode") === "rig" ||
    stringParam(ctx.params, "commercialPhase") === "rig"
  ) {
    return executeRig(ctx, opts, null);
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

function wantsGameRig(ctx: ExecutionContext): boolean {
  return ctx.params.rigForGame === true || ctx.params.rigForGame === "true";
}

function poseModeFromCtx(ctx: ExecutionContext): "t-pose" | "a-pose" | null {
  const raw = stringParam(ctx.params, "poseMode");
  if (raw === "t-pose" || raw === "a-pose") return raw;
  return wantsGameRig(ctx) ? "t-pose" : null;
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
  message?: string,
): ProviderResult {
  const pct =
    typeof progress === "number" && progress > 0
      ? ` (${Math.round(progress)}%)`
      : "";
  return {
    status: "waiting",
    message:
      message ?? `A gerar o objeto 3D${pct}. Pode levar alguns minutos.`,
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
      body: meshyCreateBodyForTier(
        tier,
        toImageDataUri(imageBytes, mime),
        poseModeFromCtx(ctx),
      ),
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
        poseMode: poseModeFromCtx(ctx),
        rigForGame: wantsGameRig(ctx),
      },
      inspected.task.progress,
    );
  }
  if (wantsGameRig(ctx)) {
    return executeRig(ctx, opts, { meshTaskId: taskId, fallback: inspected.task });
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
        body: meshyTextPreviewBody(tier, prompt, poseModeFromCtx(ctx)),
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
  if (wantsGameRig(ctx)) {
    return executeRig(ctx, opts, {
      meshTaskId: taskId,
      fallback: refineInspected.task,
    });
  }
  return writeSucceededGlb(ctx, opts, refineInspected.task, {
    meshTier: tier,
    commercialTaskId: taskId,
    previewTaskId: previewId,
    sourceMode: "text",
  });
}

async function writeUnriggedFallback(
  ctx: ExecutionContext,
  opts: MeshyOpts,
  fromMesh: { meshTaskId: string; fallback: MeshyTask } | null,
  meshTaskId: string | null,
): Promise<ProviderResult | null> {
  if (fromMesh?.fallback) {
    return writeSucceededGlb(ctx, opts, fromMesh.fallback, {
      commercialTaskId: meshTaskId,
      rigFailed: true,
    });
  }
  const url = stringParam(ctx.params, "unriggedGlbUrl");
  if (!url || !ctx.outputPath) return null;
  const glb = await downloadMeshyGlb({ url, http: opts.http });
  if ("error" in glb || !isGlbMagic(glb)) return null;
  await ctx.storage.writeFile(ctx.outputPath, glb);
  return {
    status: "done",
    outputPath: ctx.outputPath,
    message: "Malha pronta, mas o esqueleto não concluiu.",
    meta: {
      capability: ctx.capability,
      byteSize: glb.byteLength,
      rigFailed: true,
      commercialTaskId: meshTaskId,
    },
  };
}

async function executeRig(
  ctx: ExecutionContext,
  opts: MeshyOpts,
  fromMesh: { meshTaskId: string; fallback: MeshyTask } | null,
): Promise<ProviderResult> {
  const blocked = gateCommercial(ctx, opts);
  if (blocked) return blocked;
  if (Date.now() > deadlineMs(ctx, opts.timeoutMs)) {
    return { status: "failed", message: "Tempo esgotado à espera do esqueleto" };
  }

  const meshTaskId =
    fromMesh?.meshTaskId ||
    stringParam(ctx.params, "commercialMeshTaskId") ||
    (stringParam(ctx.params, "sourceMode") === "rig"
      ? null
      : stringParam(ctx.params, "commercialTaskId"));
  let rigId = stringParam(ctx.params, "rigTaskId");

  if (!rigId) {
    let body: Record<string, unknown>;
    if (meshTaskId && stringParam(ctx.params, "sourceMode") !== "rig") {
      body = { input_task_id: meshTaskId, height_meters: 1.7 };
    } else {
      if (!ctx.inputPath) {
        return {
          status: "failed",
          message: "Preparar para jogo exige um objeto 3D na biblioteca.",
        };
      }
      const exists = await ctx.storage.exists(ctx.inputPath);
      if (!exists) {
        return { status: "failed", message: "GLB de origem ausente no storage" };
      }
      const glbBytes = await ctx.storage.readFile(ctx.inputPath);
      if (!isGlbMagic(glbBytes)) {
        return { status: "failed", message: "A origem não é um GLB" };
      }
      body = { model_url: toGlbDataUri(glbBytes), height_meters: 1.7 };
    }

    const created = await createMeshyTask({
      apiKey: opts.apiKey!,
      url: RIGGING_URL,
      body,
      http: opts.http,
    });
    if ("error" in created) {
      if (fromMesh?.fallback) {
        const written = await writeSucceededGlb(ctx, opts, fromMesh.fallback, {
          sourceMode: "image",
          commercialTaskId: meshTaskId,
          rigFailed: true,
        });
        return {
          ...written,
          message: `Malha pronta, mas o esqueleto falhou: ${created.error}`,
        };
      }
      return { status: "failed", message: created.error };
    }
    rigId = created.id;
    return waitingResult(
      ctx,
      opts,
      {
        commercialPhase: "rig",
        rigTaskId: rigId,
        commercialTaskId: rigId,
        commercialMeshTaskId: meshTaskId,
        unriggedGlbUrl: fromMesh?.fallback.model_urls?.glb ?? null,
        rigForGame: true,
        poseMode: poseModeFromCtx(ctx) ?? "t-pose",
      },
      undefined,
      "A montar o esqueleto para jogo…",
    );
  }

  const inspected = await inspectMeshyTask({
    apiKey: opts.apiKey!,
    taskId: rigId,
    pollUrl: `${RIGGING_URL}/${rigId}`,
    http: opts.http,
  });
  if ("error" in inspected) {
    const saved = await writeUnriggedFallback(ctx, opts, fromMesh, meshTaskId);
    if (saved) {
      return {
        ...saved,
        message: `Malha pronta, mas o esqueleto falhou: ${inspected.error}`,
      };
    }
    return { status: "failed", message: inspected.error };
  }
  if (inspected.status === "waiting") {
    return waitingResult(
      ctx,
      opts,
      {
        commercialPhase: "rig",
        rigTaskId: rigId,
        commercialTaskId: rigId,
        commercialMeshTaskId: meshTaskId,
        rigForGame: true,
      },
      inspected.task.progress,
      "A montar o esqueleto para jogo…",
    );
  }

  const glbUrl = pickRiggedGlbUrl(inspected.task);
  if (!glbUrl) {
    return { status: "failed", message: "O esqueleto concluiu sem arquivo GLB" };
  }
  const glb = await downloadMeshyGlb({ url: glbUrl, http: opts.http });
  if ("error" in glb) {
    return { status: "failed", message: glb.error };
  }
  if (!isGlbMagic(glb)) {
    return { status: "failed", message: "Arquivo do esqueleto não é um GLB" };
  }
  await ctx.storage.writeFile(ctx.outputPath!, glb);
  const hasWalk = Boolean(inspected.task.basic_animations?.walking_glb_url);
  ctx.params.hasWalk = hasWalk;
  ctx.params.rigTaskId = rigId;
  ctx.params.clipIndex = 0;
  ctx.params.clipTaskId = null;
  return executeGameClips(ctx, opts, {
    rigTaskId: rigId,
    hasWalk,
  });
}

function siblingGlbPath(outputPath: string, stem: string): string {
  return outputPath.replace(/[^/\\]+$/, `${stem}.glb`);
}

function clipDoneMeta(
  ctx: ExecutionContext,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const idle = ctx.params.hasIdle === true || extra.hasIdle === true;
  const attack = ctx.params.hasAttack === true || extra.hasAttack === true;
  const hasWalk = ctx.params.hasWalk === true || extra.hasWalk === true;
  const names = [
    idle ? "idle" : null,
    hasWalk ? "walk" : null,
    attack ? "attack" : null,
  ].filter(Boolean);
  return {
    capability: ctx.capability,
    rigged: true,
    gameReady: true,
    hasWalk,
    hasIdle: idle,
    hasAttack: attack,
    clipNames: names,
    ...extra,
  };
}

async function executeGameClips(
  ctx: ExecutionContext,
  opts: MeshyOpts,
  seed?: { rigTaskId: string; hasWalk: boolean },
): Promise<ProviderResult> {
  const blocked = gateCommercial(ctx, opts);
  if (blocked) return blocked;
  if (Date.now() > deadlineMs(ctx, opts.timeoutMs)) {
    return clipsFinished(ctx, {
      hasWalk: seed?.hasWalk ?? ctx.params.hasWalk === true,
      message: "Personagem com esqueleto. Idle/ataque não concluíram a tempo.",
    });
  }

  const rigTaskId =
    seed?.rigTaskId || stringParam(ctx.params, "rigTaskId");
  if (!rigTaskId || !ctx.outputPath) {
    return clipsFinished(ctx, {
      hasWalk: seed?.hasWalk ?? true,
      message: "Personagem pronto para jogo — esqueleto e passo.",
    });
  }

  const index = numberParam(ctx.params, "clipIndex") ?? 0;
  if (index >= GAME_CLIP_ACTIONS.length) {
    return clipsFinished(ctx, {
      hasWalk: seed?.hasWalk ?? ctx.params.hasWalk === true,
      hasIdle: ctx.params.hasIdle === true,
      hasAttack: ctx.params.hasAttack === true,
    });
  }

  const clip = GAME_CLIP_ACTIONS[index];
  const taskId = stringParam(ctx.params, "clipTaskId");
  if (!taskId) {
    const created = await createMeshyTask({
      apiKey: opts.apiKey!,
      url: ANIMATION_URL,
      body: { rig_task_id: rigTaskId, action_id: clip.actionId },
      http: opts.http,
    });
    if ("error" in created) {
      return executeGameClipsSkip(ctx, opts, index, rigTaskId);
    }
    return waitingResult(
      ctx,
      opts,
      {
        commercialPhase: "animate",
        rigTaskId,
        clipIndex: index,
        clipName: clip.name,
        clipTaskId: created.id,
        commercialTaskId: created.id,
        rigForGame: true,
        hasWalk: seed?.hasWalk ?? ctx.params.hasWalk === true,
        hasIdle: ctx.params.hasIdle === true,
        hasAttack: ctx.params.hasAttack === true,
      },
      undefined,
      clip.name === "idle"
        ? "A gravar o idle para jogo…"
        : "A gravar o ataque para jogo…",
    );
  }

  const inspected = await inspectMeshyTask({
    apiKey: opts.apiKey!,
    taskId,
    pollUrl: `${ANIMATION_URL}/${taskId}`,
    http: opts.http,
  });
  if ("error" in inspected) {
    return executeGameClipsSkip(ctx, opts, index, rigTaskId);
  }
  if (inspected.status === "waiting") {
    return waitingResult(
      ctx,
      opts,
      {
        commercialPhase: "animate",
        rigTaskId,
        clipIndex: index,
        clipName: clip.name,
        clipTaskId: taskId,
        commercialTaskId: taskId,
        rigForGame: true,
        hasWalk: ctx.params.hasWalk === true,
        hasIdle: ctx.params.hasIdle === true,
        hasAttack: ctx.params.hasAttack === true,
      },
      inspected.task.progress,
      clip.name === "idle"
        ? "A gravar o idle para jogo…"
        : "A gravar o ataque para jogo…",
    );
  }

  const glbUrl = pickAnimationGlbUrl(inspected.task);
  if (glbUrl && ctx.outputPath) {
    const glb = await downloadMeshyGlb({ url: glbUrl, http: opts.http });
    if (!("error" in glb) && isGlbMagic(glb)) {
      await ctx.storage.writeFile(siblingGlbPath(ctx.outputPath, clip.name), glb);
    }
  }

  const flags = {
    hasWalk: seed?.hasWalk ?? ctx.params.hasWalk === true,
    hasIdle: clip.name === "idle" || ctx.params.hasIdle === true,
    hasAttack: clip.name === "attack" || ctx.params.hasAttack === true,
  };
  const next = index + 1;
  if (next >= GAME_CLIP_ACTIONS.length) {
    return clipsFinished(ctx, flags);
  }

  ctx.params.clipIndex = next;
  ctx.params.clipTaskId = null;
  ctx.params.hasIdle = flags.hasIdle;
  ctx.params.hasAttack = flags.hasAttack;
  ctx.params.hasWalk = flags.hasWalk;
  ctx.params.rigTaskId = rigTaskId;
  return executeGameClips(ctx, opts);
}

async function executeGameClipsSkip(
  ctx: ExecutionContext,
  opts: MeshyOpts,
  index: number,
  rigTaskId: string,
): Promise<ProviderResult> {
  const next = index + 1;
  ctx.params.clipIndex = next;
  ctx.params.clipTaskId = null;
  ctx.params.rigTaskId = rigTaskId;
  if (next >= GAME_CLIP_ACTIONS.length) {
    return clipsFinished(ctx, {
      hasWalk: ctx.params.hasWalk === true,
      hasIdle: ctx.params.hasIdle === true,
      hasAttack: ctx.params.hasAttack === true,
      message:
        "Personagem com esqueleto e passo. Idle/ataque não entraram neste ficheiro.",
    });
  }
  return executeGameClips(ctx, opts);
}

function clipsFinished(
  ctx: ExecutionContext,
  flags: {
    hasWalk?: boolean;
    hasIdle?: boolean;
    hasAttack?: boolean;
    message?: string;
  },
): ProviderResult {
  const idle = Boolean(flags.hasIdle);
  const attack = Boolean(flags.hasAttack);
  const hasWalk = flags.hasWalk !== false;
  const message =
    flags.message ??
    (idle && attack
      ? "Personagem pronto para jogo — idle, passo e ataque."
      : hasWalk
        ? "Personagem pronto para jogo — esqueleto e passo."
        : "Personagem pronto para jogo — esqueleto montado.");
  return {
    status: "done",
    outputPath: ctx.outputPath,
    message,
    meta: clipDoneMeta(ctx, {
      hasWalk,
      hasIdle: idle,
      hasAttack: attack,
      commercialTaskId: stringParam(ctx.params, "rigTaskId"),
    }),
  };
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
