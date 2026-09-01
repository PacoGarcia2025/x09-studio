import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const TRELLIS_EXIT = {
  deps: 10,
  cuda: 11,
  weights: 12,
  infer: 13,
  args: 14,
  oom: 15,
} as const;

export type TrellisSidecarMetrics = {
  elapsedMs?: number;
  vramPeakMb?: number;
  vramTotalMb?: number;
  vramAllocMb?: number;
  vramReservedMb?: number;
  cudaName?: string;
  glbBytes?: number;
  vertexCount?: number;
  faceCount?: number;
  imageWidth?: number;
  imageHeight?: number;
  phasesMs?: Record<string, number>;
};

export type TrellisSidecarResult =
  | { ok: true; metrics?: TrellisSidecarMetrics }
  | { ok: false; message: string; metrics?: TrellisSidecarMetrics };

export function huggingfaceTokenFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  for (const key of [
    "HUGGINGFACE_TOKEN",
    "HUGGINGFACE_API_KEY",
    "HF_TOKEN",
    "HUGGINGFACE_HUB_TOKEN",
    "HUGGING_FACE_HUB_TOKEN",
  ]) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return null;
}

export function resolveTrellisPython(): string | null {
  const raw = process.env.STUDIO_TRELLIS_PYTHON?.trim();
  return raw || null;
}

export function resolveTrellisScript(): string {
  const explicit = process.env.STUDIO_TRELLIS_SCRIPT?.trim();
  if (explicit) return explicit;
  return path.join(process.cwd(), "services", "trellis-worker", "run.py");
}

export function resolveTrellisRoot(): string | null {
  const raw = process.env.STUDIO_TRELLIS_ROOT?.trim();
  return raw || null;
}

export function trellisTimeoutMs(): number {
  const raw = Number(process.env.STUDIO_TRELLIS_TIMEOUT_MS ?? 1_800_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 1_800_000;
}

function messageForExit(code: number | null, detail: string): string {
  const trimmed = detail.replace(/\s+/g, " ").slice(0, 400);
  if (code === TRELLIS_EXIT.deps) {
    return trimmed || "Dependências TRELLIS ausentes neste Python.";
  }
  if (code === TRELLIS_EXIT.cuda) {
    return trimmed || "CUDA indisponível. TRELLIS exige GPU NVIDIA.";
  }
  if (code === TRELLIS_EXIT.weights) {
    return trimmed || "Pesos TRELLIS indisponíveis (Hugging Face Hub).";
  }
  if (code === TRELLIS_EXIT.infer) {
    return trimmed || "Inferência TRELLIS falhou.";
  }
  if (code === TRELLIS_EXIT.oom) {
    return trimmed || "VRAM insuficiente (CUDA OOM).";
  }
  if (code === TRELLIS_EXIT.args) {
    return trimmed || "Argumentos inválidos no sidecar TRELLIS.";
  }
  if (code === null) {
    return trimmed || "Sidecar TRELLIS encerrado sem código de saída.";
  }
  return trimmed || `Sidecar TRELLIS saiu com código ${code}.`;
}

function parseSidecarJson(stdout: string): Record<string, unknown> | null {
  const lines = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (!line.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function metricsFromPayload(
  payload: Record<string, unknown> | null,
): TrellisSidecarMetrics | undefined {
  const raw = payload?.metrics;
  if (!raw || typeof raw !== "object") return undefined;
  return raw as TrellisSidecarMetrics;
}

function parseSidecarMessage(stdout: string, stderr: string): string {
  const payload = parseSidecarJson(stdout);
  const message = payload?.message;
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }
  return stderr.trim() || stdout.trim();
}

export async function runTrellisSidecar(input: {
  python: string;
  script: string;
  inputFile: string;
  outputFile: string;
  trellisRoot: string | null;
  timeoutMs: number;
  extraEnv?: Record<string, string>;
}): Promise<TrellisSidecarResult> {
  const token = huggingfaceTokenFromEnv();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...input.extraEnv,
    PYTHONUNBUFFERED: "1",
  };
  if (input.trellisRoot) {
    env.STUDIO_TRELLIS_ROOT = input.trellisRoot;
    const prev = env.PYTHONPATH ?? "";
    env.PYTHONPATH = prev
      ? `${input.trellisRoot}${path.delimiter}${prev}`
      : input.trellisRoot;
  }
  if (token) {
    env.HF_TOKEN = token;
    env.HUGGINGFACE_HUB_TOKEN = token;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: TrellisSidecarResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    let child;
    try {
      child = spawn(
        input.python,
        [input.script, "--input", input.inputFile, "--output", input.outputFile],
        {
          env,
          cwd: input.trellisRoot || path.dirname(input.script),
          windowsHide: true,
        },
      );
    } catch (err) {
      finish({
        ok: false,
        message:
          err instanceof Error
            ? `Não foi possível iniciar o Python TRELLIS: ${err.message}`
            : "Não foi possível iniciar o Python TRELLIS.",
      });
      return;
    }

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderr += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) console.error(line.startsWith("[trellis") ? line : `[trellis] ${line}`);
      }
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({
        ok: false,
        message: `Timeout do sidecar TRELLIS (${input.timeoutMs}ms).`,
      });
    }, input.timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      const notFound = "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT";
      finish({
        ok: false,
        message: notFound
          ? `Python do sidecar não encontrado (${input.python}).`
          : `Falha ao executar o sidecar TRELLIS: ${err.message}`,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const payload = parseSidecarJson(stdout);
      const metrics = metricsFromPayload(payload);
      if (code === 0) {
        finish({ ok: true, metrics });
        return;
      }
      finish({
        ok: false,
        message: messageForExit(code, parseSidecarMessage(stdout, stderr)),
        metrics,
      });
    });
  });
}

export async function withTrellisTempDir<T>(
  jobId: string,
  fn: (dir: string) => Promise<T>,
): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `x09-trellis-${jobId.slice(0, 8)}-`));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function inputExtension(storagePath: string): string {
  const name = storagePath.split("/").pop() ?? "source.png";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  if (ext && ext.length <= 8) return ext;
  return "png";
}

export function isGlbMagic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x67 &&
    bytes[1] === 0x6c &&
    bytes[2] === 0x54 &&
    bytes[3] === 0x46
  );
}
