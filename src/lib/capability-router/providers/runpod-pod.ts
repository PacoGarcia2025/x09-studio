/**
 * Ciclo de vida do Pod RunPod — só o Provider TRELLIS usa.
 * Com network volume: cria um 4090 no pedido e TERMINATE no fim (o disco fica).
 * Sem volume: START/STOP do pod fixo (preso ao mesmo host).
 */

import fs from "node:fs";
import path from "node:path";
import { TRELLIS_VOLUME } from "@/lib/capability-router/providers/trellis-volume";
import { runtimeEnv, studioAppRoot } from "@/lib/env/runtime";

export type RunpodSshTarget = {
  podId: string;
  host: string;
  port: number;
  username: string;
};

export type RunpodPodSnapshot = {
  id: string;
  status: string;
  ssh: RunpodSshTarget | null;
};

type RunpodClient = {
  getPod: (podId: string) => Promise<RunpodPodSnapshot>;
  action: (
    podId: string,
    action: "start" | "stop" | "terminate",
  ) => Promise<RunpodPodSnapshot | null>;
  createPod: (body: Record<string, unknown>) => Promise<RunpodPodSnapshot>;
};

const API_BASE = "https://api.runpod.io/v2";

function readEnv(
  env: NodeJS.ProcessEnv,
  key:
    | "STUDIO_RUNPOD_API_KEY"
    | "RUNPOD_API_KEY"
    | "STUDIO_RUNPOD_POD_ID"
    | "STUDIO_RUNPOD_SSH_KEY"
    | "STUDIO_RUNPOD_STOP_AFTER_JOB"
    | "STUDIO_RUNPOD_START_TIMEOUT_MS"
    | "STUDIO_RUNPOD_NETWORK_VOLUME_ID"
    | "STUDIO_RUNPOD_DATACENTER"
    | "STUDIO_RUNPOD_GPU_TYPE"
    | "STUDIO_RUNPOD_IMAGE"
    | "STUDIO_RUNPOD_SSH_PUBLIC_KEY",
): string | undefined {
  if (env !== process.env) {
    const value = env[key]?.trim();
    return value || undefined;
  }
  const live = runtimeEnv(key);
  if (live) return live;
  // Fallback estático: o bundler do Next só injeta process.env.NOME_FIXO.
  switch (key) {
    case "STUDIO_RUNPOD_API_KEY":
      return process.env.STUDIO_RUNPOD_API_KEY?.trim() || undefined;
    case "RUNPOD_API_KEY":
      return process.env.RUNPOD_API_KEY?.trim() || undefined;
    case "STUDIO_RUNPOD_POD_ID":
      return process.env.STUDIO_RUNPOD_POD_ID?.trim() || undefined;
    case "STUDIO_RUNPOD_SSH_KEY":
      return process.env.STUDIO_RUNPOD_SSH_KEY?.trim() || undefined;
    case "STUDIO_RUNPOD_STOP_AFTER_JOB":
      return process.env.STUDIO_RUNPOD_STOP_AFTER_JOB?.trim() || undefined;
    case "STUDIO_RUNPOD_START_TIMEOUT_MS":
      return process.env.STUDIO_RUNPOD_START_TIMEOUT_MS?.trim() || undefined;
    case "STUDIO_RUNPOD_NETWORK_VOLUME_ID":
      return process.env.STUDIO_RUNPOD_NETWORK_VOLUME_ID?.trim() || undefined;
    case "STUDIO_RUNPOD_DATACENTER":
      return process.env.STUDIO_RUNPOD_DATACENTER?.trim() || undefined;
    case "STUDIO_RUNPOD_GPU_TYPE":
      return process.env.STUDIO_RUNPOD_GPU_TYPE?.trim() || undefined;
    case "STUDIO_RUNPOD_IMAGE":
      return process.env.STUDIO_RUNPOD_IMAGE?.trim() || undefined;
    case "STUDIO_RUNPOD_SSH_PUBLIC_KEY":
      return process.env.STUDIO_RUNPOD_SSH_PUBLIC_KEY?.trim() || undefined;
  }
}

export function resolveRunpodApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return (
    readEnv(env, "STUDIO_RUNPOD_API_KEY") ||
    readEnv(env, "RUNPOD_API_KEY") ||
    null
  );
}

export function resolveRunpodPodId(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return readEnv(env, "STUDIO_RUNPOD_POD_ID") || null;
}

export function resolveRunpodNetworkVolumeId(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return readEnv(env, "STUDIO_RUNPOD_NETWORK_VOLUME_ID") || null;
}

export function isRunpodOnDemandConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(
    resolveRunpodApiKey(env) &&
      (resolveRunpodNetworkVolumeId(env) || resolveRunpodPodId(env)),
  );
}

export function resolveRunpodSshKeyPath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const raw = readEnv(env, "STUDIO_RUNPOD_SSH_KEY") || ".runpod-ssh/trellis_ed25519";
  if (path.isAbsolute(raw)) return raw;
  return path.resolve(studioAppRoot(), raw);
}

export function runpodStartTimeoutMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = Number(readEnv(env, "STUDIO_RUNPOD_START_TIMEOUT_MS") ?? 300_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 300_000;
}

function resolveSshPublicKey(env: NodeJS.ProcessEnv): string | null {
  const explicit = readEnv(env, "STUDIO_RUNPOD_SSH_PUBLIC_KEY");
  if (explicit) return explicit;
  const priv = resolveRunpodSshKeyPath(env);
  const pubPath = priv.endsWith(".pub") ? priv : `${priv}.pub`;
  try {
    const text = fs.readFileSync(path.resolve(pubPath), "utf8").trim();
    return text || null;
  } catch {
    return null;
  }
}

function isCapacityError(message: string): boolean {
  return (
    /not enough free GPUs/i.test(message) ||
    /no longer any instances available/i.test(message) ||
    /insufficient/i.test(message)
  );
}

function parseSsh(raw: unknown, podId: string): RunpodSshTarget | null {
  if (!raw || typeof raw !== "object") return null;
  const direct = (raw as { direct?: unknown }).direct;
  if (!direct || typeof direct !== "object") return null;
  const host = (direct as { host?: unknown }).host;
  const port = (direct as { port?: unknown }).port;
  const username = (direct as { username?: unknown }).username;
  if (typeof host !== "string" || !host) return null;
  const parsedPort = typeof port === "number" ? port : Number(port);
  if (!Number.isFinite(parsedPort) || parsedPort <= 0) return null;
  return {
    podId,
    host,
    port: parsedPort,
    username: typeof username === "string" && username ? username : "root",
  };
}

export function snapshotFromPodPayload(payload: unknown): RunpodPodSnapshot {
  if (!payload || typeof payload !== "object") {
    throw new Error("Resposta RunPod inválida.");
  }
  const id = (payload as { id?: unknown }).id;
  const status = (payload as { status?: unknown }).status;
  if (typeof id !== "string" || !id) {
    throw new Error("Pod RunPod sem id.");
  }
  return {
    id,
    status: typeof status === "string" ? status : "UNKNOWN",
    ssh: parseSsh((payload as { ssh?: unknown }).ssh, id),
  };
}

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as { detail?: unknown; title?: unknown };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) {
      return parsed.detail.trim();
    }
  } catch {
    /* ignore */
  }
  return text.slice(0, 240) || res.statusText;
}

export function createRunpodRestClient(apiKey: string): RunpodClient {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  return {
    async getPod(podId) {
      const res = await fetch(`${API_BASE}/pods/${podId}`, { headers });
      if (!res.ok) {
        throw new Error(`GET pod ${podId} falhou (${res.status}): ${await readError(res)}`);
      }
      return snapshotFromPodPayload(await res.json());
    },
    async action(podId, action) {
      const res = await fetch(`${API_BASE}/pods/${podId}/action`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action }),
      });
      if (res.status === 204) return null;
      if (res.status === 409) {
        return this.getPod(podId);
      }
      if (!res.ok) {
        throw new Error(
          `${action} pod ${podId} falhou (${res.status}): ${await readError(res)}`,
        );
      }
      return snapshotFromPodPayload(await res.json());
    },
    async createPod(body) {
      const res = await fetch(`${API_BASE}/pods`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`create pod falhou (${res.status}): ${await readError(res)}`);
      }
      return snapshotFromPodPayload(await res.json());
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForRunpodSsh(
  client: RunpodClient,
  podId: string,
  timeoutMs: number,
  now: () => number = Date.now,
  pause: (ms: number) => Promise<void> = sleep,
): Promise<RunpodSshTarget> {
  const deadline = now() + timeoutMs;
  let last = "UNKNOWN";
  while (now() < deadline) {
    const snap = await client.getPod(podId);
    last = snap.status;
    if (snap.status === "RUNNING" && snap.ssh) {
      return snap.ssh;
    }
    if (snap.status === "ERROR" || snap.status === "TERMINATED") {
      throw new Error(`Pod ${podId} em estado ${snap.status}.`);
    }
    await pause(4000);
  }
  throw new Error(
    `Timeout à espera do SSH do pod ${podId} (último estado: ${last}).`,
  );
}

type LeaseState = {
  count: number;
  session: RunpodSshTarget | null;
  inflight: Promise<RunpodSshTarget> | null;
};

const lease: LeaseState = {
  count: 0,
  session: null,
  inflight: null,
};

export function resetRunpodLeaseForTests(): void {
  lease.count = 0;
  lease.session = null;
  lease.inflight = null;
}

function isHostGpuFullError(message: string): boolean {
  return isCapacityError(message);
}

async function bootEphemeralPod(
  client: RunpodClient,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
  pause: (ms: number) => Promise<void>,
): Promise<RunpodSshTarget> {
  const volumeId = resolveRunpodNetworkVolumeId(env);
  const pub = resolveSshPublicKey(env);
  if (!volumeId) {
    throw new Error("STUDIO_RUNPOD_NETWORK_VOLUME_ID ausente.");
  }
  if (!pub) {
    throw new Error(
      "Chave SSH pública ausente (.runpod-ssh/trellis_ed25519.pub).",
    );
  }

  const body = {
    name: `x09-trellis-${Date.now()}`,
    image:
      readEnv(env, "STUDIO_RUNPOD_IMAGE") || TRELLIS_VOLUME.image,
    cloud: "SECURE",
    gpu: {
      id: readEnv(env, "STUDIO_RUNPOD_GPU_TYPE") || "NVIDIA GeForce RTX 4090",
      count: 1,
      minCudaVersion: "12.4",
    },
    dataCenterIds: [readEnv(env, "STUDIO_RUNPOD_DATACENTER") || "EU-RO-1"],
    disk: 40,
    ports: ["22/tcp"],
    startSsh: true,
    env: {
      PUBLIC_KEY: pub,
      NVIDIA_VISIBLE_DEVICES: "all",
    },
    mounts: {
      network: [{ volumeId, path: TRELLIS_VOLUME.workspace }],
    },
  };

  const deadline = Date.now() + timeoutMs;
  let lastError = "create pod falhou";
  while (Date.now() < deadline) {
    try {
      const created = await client.createPod(body);
      return waitForRunpodSsh(
        client,
        created.id,
        Math.max(1000, deadline - Date.now()),
        Date.now,
        pause,
      );
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (!isCapacityError(lastError)) throw err;
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      console.error(
        `[runpod] sem GPU livre para pod novo; nova tentativa em 15s (${lastError})`,
      );
      await pause(Math.min(15_000, remaining));
    }
  }
  throw new Error(
    `Sem 4090 livre neste momento. Tente de novo daqui a uns minutos. ${lastError}`,
  );
}

async function bootPod(
  client: RunpodClient,
  podId: string,
  timeoutMs: number,
  pause: (ms: number) => Promise<void> = sleep,
): Promise<RunpodSshTarget> {
  const deadline = Date.now() + timeoutMs;
  const current = await client.getPod(podId);
  if (current.status === "RUNNING" && current.ssh) {
    return current.ssh;
  }

  let lastError = `Não foi possível ligar o pod ${podId}.`;
  while (Date.now() < deadline) {
    try {
      await client.action(podId, "start");
      return waitForRunpodSsh(
        client,
        podId,
        Math.max(1000, deadline - Date.now()),
        Date.now,
        pause,
      );
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (!isHostGpuFullError(lastError)) throw err;
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      console.error(
        `[runpod] host sem GPU livre; nova tentativa em 15s (${lastError})`,
      );
      await pause(Math.min(15_000, remaining));
    }
  }
  throw new Error(
    `GPU do host ocupada (o pod não muda de máquina). Espere e processe de novo. ${lastError}`,
  );
}

export async function acquireRunpodGpu(
  env: NodeJS.ProcessEnv = process.env,
  factory: (apiKey: string) => RunpodClient = createRunpodRestClient,
  pause: (ms: number) => Promise<void> = sleep,
): Promise<RunpodSshTarget> {
  if (!isRunpodOnDemandConfigured(env)) {
    throw new Error("GPU RunPod sob demanda não configurada.");
  }
  if (lease.session && lease.count > 0) {
    lease.count += 1;
    return lease.session;
  }
  if (!lease.inflight) {
    const apiKey = resolveRunpodApiKey(env);
    if (!apiKey) {
      throw new Error("STUDIO_RUNPOD_API_KEY ausente.");
    }
    const client = factory(apiKey);
    const volumeId = resolveRunpodNetworkVolumeId(env);
    const podId = resolveRunpodPodId(env);
    lease.inflight = (
      volumeId
        ? bootEphemeralPod(client, env, runpodStartTimeoutMs(env), pause)
        : podId
          ? bootPod(client, podId, runpodStartTimeoutMs(env), pause)
          : Promise.reject(
              new Error(
                "STUDIO_RUNPOD_NETWORK_VOLUME_ID ou STUDIO_RUNPOD_POD_ID ausente.",
              ),
            )
    ).catch((err) => {
      lease.inflight = null;
      throw err;
    });
  }
  const session = await lease.inflight;
  lease.session = session;
  lease.count += 1;
  return session;
}

export async function releaseRunpodGpu(
  env: NodeJS.ProcessEnv = process.env,
  factory: (apiKey: string) => RunpodClient = createRunpodRestClient,
): Promise<void> {
  lease.count = Math.max(0, lease.count - 1);
  if (lease.count > 0) return;
  const session = lease.session;
  lease.session = null;
  lease.inflight = null;
  if (!session) return;
  if (readEnv(env, "STUDIO_RUNPOD_STOP_AFTER_JOB") === "false") return;
  const apiKey = resolveRunpodApiKey(env);
  if (!apiKey) return;
  const volumeMode = Boolean(resolveRunpodNetworkVolumeId(env));
  const action = volumeMode ? "terminate" : "stop";
  try {
    await factory(apiKey).action(session.podId, action);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[runpod] ${action} falhou após o job: ${message}`);
  }
}
