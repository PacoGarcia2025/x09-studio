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
  target_formats: string[];
};

export type MeshyTask = {
  id: string;
  status: MeshyTaskStatus;
  progress?: number;
  model_urls?: { glb?: string };
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

export function meshyCreateBodyForTier(
  tier: "game" | "flagship",
  imageDataUri: string,
): MeshyCreateBody {
  if (tier === "game") {
    return {
      image_url: imageDataUri,
      model_type: "smart-topology",
      ai_model: "meshy-t2",
      should_texture: true,
      target_formats: ["glb"],
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
): Record<string, unknown> {
  if (tier === "game") {
    return {
      mode: "preview",
      prompt,
      model_type: "smart-topology",
      ai_model: "meshy-t2",
      target_formats: ["glb"],
    };
  }
  return {
    mode: "preview",
    prompt,
    model_type: "standard",
    ai_model: "meshy-7",
    should_remesh: false,
    target_formats: ["glb"],
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
  return json as unknown as MeshyTask;
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

export { IMAGE_TO_3D_URL, TEXT_TO_3D_URL, RETEXTURE_URL };
