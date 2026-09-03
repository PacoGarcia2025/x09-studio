export type MeshyTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

export type MeshyCreateBody = {
  image_url: string;
  model_type: "standard" | "smart-topology";
  ai_model: string;
  should_texture: boolean;
  enable_pbr?: boolean;
  should_remesh?: boolean;
  pose_mode?: "t-pose" | "a-pose";
  target_formats: string[];
};

export type MeshyTask = {
  id: string;
  status: MeshyTaskStatus;
  progress?: number;
  model_urls?: { glb?: string };
  rigged_character_glb_url?: string;
  basic_animations?: {
    walking_glb_url?: string;
    running_glb_url?: string;
  };
  task_error?: { message?: string };
  consumed_credits?: number;
};

export type MeshyHttp = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

const IMAGE_TO_3D_URL = "https://api.meshy.ai/openapi/v1/image-to-3d";
const TEXT_TO_3D_URL = "https://api.meshy.ai/openapi/v2/text-to-3d";
const RETEXTURE_URL = "https://api.meshy.ai/openapi/v1/retexture";
const RIGGING_URL = "https://api.meshy.ai/openapi/v1/rigging";

export function meshyCreateBodyForTier(
  tier: "game" | "flagship",
  imageDataUri: string,
  poseMode?: "t-pose" | "a-pose" | null,
): MeshyCreateBody {
  const pose =
    poseMode === "t-pose" || poseMode === "a-pose" ? { pose_mode: poseMode } : {};
  if (tier === "game") {
    return {
      image_url: imageDataUri,
      model_type: "smart-topology",
      ai_model: "meshy-t2",
      should_texture: true,
      target_formats: ["glb"],
      ...pose,
    };
  }
  return {
    image_url: imageDataUri,
    model_type: "standard",
    ai_model: "meshy-7",
    should_texture: true,
    enable_pbr: true,
    should_remesh: false,
    target_formats: ["glb"],
    ...pose,
  };
}

export function toImageDataUri(
  bytes: Uint8Array,
  mime: "image/png" | "image/jpeg",
): string {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

export function toGlbDataUri(bytes: Uint8Array): string {
  return `data:application/octet-stream;base64,${Buffer.from(bytes).toString("base64")}`;
}

export function meshyTextPreviewBody(
  tier: "game" | "flagship",
  prompt: string,
  poseMode?: "t-pose" | "a-pose" | null,
): Record<string, unknown> {
  const pose =
    poseMode === "t-pose" || poseMode === "a-pose" ? { pose_mode: poseMode } : {};
  if (tier === "game") {
    return {
      mode: "preview",
      prompt,
      model_type: "smart-topology",
      ai_model: "meshy-t2",
      target_formats: ["glb"],
      ...pose,
    };
  }
  return {
    mode: "preview",
    prompt,
    model_type: "standard",
    ai_model: "meshy-7",
    should_remesh: false,
    target_formats: ["glb"],
    ...pose,
  };
}

export function meshyTextRefineBody(
  previewTaskId: string,
  tier: "game" | "flagship",
): Record<string, unknown> {
  return {
    mode: "refine",
    preview_task_id: previewTaskId,
    enable_pbr: tier === "flagship",
    texture_resolution: "2k",
    target_formats: ["glb"],
  };
}

export function meshyRetextureBody(
  modelDataUri: string,
  prompt: string,
): Record<string, unknown> {
  return {
    model_url: modelDataUri,
    text_style_prompt: prompt,
    ai_model: "latest",
    enable_pbr: true,
    texture_resolution: "2k",
    target_formats: ["glb"],
  };
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text.slice(0, 400) };
  }
}

function taskIdFromJson(json: Record<string, unknown>): string {
  if (typeof json.result === "string") return json.result;
  if (typeof json.id === "string") return json.id;
  return "";
}

function nestedResult(json: Record<string, unknown>): Record<string, unknown> {
  return json.result && typeof json.result === "object" && !Array.isArray(json.result)
    ? (json.result as Record<string, unknown>)
    : {};
}

/** Image/text tasks put URLs at the root; rigging nests them under `result`. */
export function normalizeMeshyTask(json: Record<string, unknown>): MeshyTask {
  const nested = nestedResult(json);
  const modelUrls = (json.model_urls ?? nested.model_urls) as
    | MeshyTask["model_urls"]
    | undefined;
  const animations = (json.basic_animations ?? nested.basic_animations) as
    | MeshyTask["basic_animations"]
    | undefined;
  const rigged =
    (typeof json.rigged_character_glb_url === "string" &&
      json.rigged_character_glb_url) ||
    (typeof nested.rigged_character_glb_url === "string" &&
      nested.rigged_character_glb_url) ||
    undefined;
  return {
    id: typeof json.id === "string" ? json.id : "",
    status: json.status as MeshyTaskStatus,
    progress: typeof json.progress === "number" ? json.progress : undefined,
    model_urls: modelUrls,
    rigged_character_glb_url: rigged,
    basic_animations: animations,
    task_error: json.task_error as MeshyTask["task_error"],
    consumed_credits:
      typeof json.consumed_credits === "number" ? json.consumed_credits : undefined,
  };
}

export async function createMeshyTask(input: {
  apiKey: string;
  url: string;
  body: Record<string, unknown>;
  http?: MeshyHttp;
}): Promise<{ id: string } | { error: string }> {
  const http = input.http ?? fetch;
  const res = await http(input.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.body),
  });
  const json = await readJson(res);
  if (res.status === 402) {
    return { error: "Créditos da API comercial esgotados." };
  }
  if (res.status === 422 && input.url.includes("/rigging")) {
    return {
      error:
        "O esqueleto só funciona em personagens humanoides, de frente e com textura.",
    };
  }
  if (!res.ok) {
    const msg =
      typeof json.message === "string"
        ? json.message
        : `API comercial recusou o pedido (${res.status})`;
    return { error: msg.slice(0, 400) };
  }
  const id = taskIdFromJson(json);
  if (!id) return { error: "API comercial não devolveu id da tarefa" };
  return { id };
}

export async function getMeshyTask(input: {
  apiKey: string;
  url: string;
  http?: MeshyHttp;
}): Promise<MeshyTask | { error: string }> {
  const http = input.http ?? fetch;
  const res = await http(input.url, {
    headers: { Authorization: `Bearer ${input.apiKey}` },
  });
  const json = await readJson(res);
  if (!res.ok) {
    const msg =
      typeof json.message === "string"
        ? json.message
        : `Falha ao consultar a tarefa (${res.status})`;
    return { error: msg.slice(0, 400) };
  }
  return normalizeMeshyTask(json);
}

export async function createMeshyImageTo3dTask(input: {
  apiKey: string;
  body: MeshyCreateBody;
  http?: MeshyHttp;
}): Promise<{ id: string } | { error: string }> {
  return createMeshyTask({
    apiKey: input.apiKey,
    url: IMAGE_TO_3D_URL,
    body: input.body as unknown as Record<string, unknown>,
    http: input.http,
  });
}

export async function getMeshyImageTo3dTask(input: {
  apiKey: string;
  taskId: string;
  http?: MeshyHttp;
}): Promise<MeshyTask | { error: string }> {
  return getMeshyTask({
    apiKey: input.apiKey,
    url: `${IMAGE_TO_3D_URL}/${input.taskId}`,
    http: input.http,
  });
}

export async function downloadMeshyGlb(input: {
  url: string;
  http?: MeshyHttp;
}): Promise<Uint8Array | { error: string }> {
  const http = input.http ?? fetch;
  const res = await http(input.url);
  if (!res.ok) {
    return { error: `Falha ao descarregar o GLB (${res.status})` };
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  return buf;
}

export async function pollMeshyTask(input: {
  apiKey: string;
  taskId: string;
  timeoutMs: number;
  http?: MeshyHttp;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  pollUrl?: string;
}): Promise<MeshyTask | { error: string }> {
  const now = input.now ?? Date.now;
  const sleep = input.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const deadline = now() + input.timeoutMs;
  let delay = 2000;
  const pollUrl =
    input.pollUrl ?? `${IMAGE_TO_3D_URL}/${input.taskId}`;
  while (now() < deadline) {
    const task = await getMeshyTask({
      apiKey: input.apiKey,
      url: pollUrl,
      http: input.http,
    });
    if ("error" in task) return task;
    if (task.status === "SUCCEEDED") return task;
    if (task.status === "FAILED" || task.status === "CANCELED") {
      const msg = task.task_error?.message?.trim() || "Geração comercial falhou";
      return { error: msg.slice(0, 400) };
    }
    await sleep(delay);
    delay = Math.min(5000, delay + 500);
  }
  return { error: "Tempo esgotado à espera da geração comercial" };
}

export function pickRiggedGlbUrl(task: MeshyTask): string | null {
  return (
    task.basic_animations?.walking_glb_url ||
    task.basic_animations?.running_glb_url ||
    task.rigged_character_glb_url ||
    task.model_urls?.glb ||
    null
  );
}

export { IMAGE_TO_3D_URL, TEXT_TO_3D_URL, RETEXTURE_URL, RIGGING_URL };
