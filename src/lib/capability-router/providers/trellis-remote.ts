import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { TrellisSidecarMetrics, TrellisSidecarResult } from "@/lib/capability-router/providers/trellis-run";
import {
  resolveRunpodSshKeyPath,
  type RunpodSshTarget,
} from "@/lib/capability-router/providers/runpod-pod";
import { TRELLIS_VOLUME } from "@/lib/capability-router/providers/trellis-volume";
import { huggingfaceTokenFromEnv } from "@/lib/capability-router/providers/trellis-run";

function knownHostsFile(): string {
  return process.platform === "win32" ? "NUL" : "/dev/null";
}

function sshFlags(target: RunpodSshTarget, keyPath: string): string[] {
  return [
    "-i",
    keyPath,
    "-o",
    "IdentitiesOnly=yes",
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    `UserKnownHostsFile=${knownHostsFile()}`,
    "-o",
    "ConnectTimeout=20",
  ];
}

function runCommand(
  bin: string,
  args: string[],
  timeoutMs: number,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Timeout ${bin} (${timeoutMs}ms)`));
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

async function ssh(
  target: RunpodSshTarget,
  keyPath: string,
  remoteCommand: string,
  timeoutMs: number,
) {
  return runCommand(
    "ssh",
    [
      ...sshFlags(target, keyPath),
      "-p",
      String(target.port),
      `${target.username}@${target.host}`,
      remoteCommand,
    ],
    timeoutMs,
  );
}

async function scp(
  target: RunpodSshTarget,
  keyPath: string,
  from: string,
  to: string,
  timeoutMs: number,
) {
  return runCommand(
    "scp",
    [...sshFlags(target, keyPath), "-P", String(target.port), from, to],
    timeoutMs,
  );
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

export async function runTrellisOnRunpod(input: {
  session: RunpodSshTarget;
  script: string;
  inputFile: string;
  outputFile: string;
  trellisRoot: string | null;
  timeoutMs: number;
  sshKeyPath?: string;
}): Promise<TrellisSidecarResult> {
  const keyPath = input.sshKeyPath ?? resolveRunpodSshKeyPath();
  try {
    await fs.access(keyPath);
  } catch {
    return {
      ok: false,
      message: `Chave SSH RunPod ausente (${keyPath}). Defina STUDIO_RUNPOD_SSH_KEY.`,
    };
  }

  const remoteRoot = input.trellisRoot || TRELLIS_VOLUME.root;
  const remotePython = TRELLIS_VOLUME.python;
  const hfToken = huggingfaceTokenFromEnv() ?? "";
  const jobDir = `/workspace/x09-jobs/${path.basename(path.dirname(input.inputFile))}`;
  const remoteInput = `${jobDir}/input${path.extname(input.inputFile) || ".png"}`;
  const remoteOutput = `${jobDir}/output.glb`;
  const remoteScript = `${jobDir}/run.py`;
  const dest = `${input.session.username}@${input.session.host}`;

  let prep = await ssh(input.session, keyPath, `mkdir -p ${jobDir}`, 30_000);
  for (let attempt = 0; attempt < 8 && prep.code !== 0; attempt += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    prep = await ssh(input.session, keyPath, `mkdir -p ${jobDir}`, 30_000);
  }
  if (prep.code !== 0) {
    return { ok: false, message: `SSH mkdir falhou: ${(prep.stderr || prep.stdout).slice(0, 300)}` };
  }

  const upScript = await scp(
    input.session,
    keyPath,
    input.script,
    `${dest}:${remoteScript}`,
    60_000,
  );
  if (upScript.code !== 0) {
    return {
      ok: false,
      message: `SCP do sidecar falhou: ${(upScript.stderr || upScript.stdout).slice(0, 300)}`,
    };
  }

  const upImage = await scp(
    input.session,
    keyPath,
    input.inputFile,
    `${dest}:${remoteInput}`,
    60_000,
  );
  if (upImage.code !== 0) {
    return {
      ok: false,
      message: `SCP da imagem falhou: ${(upImage.stderr || upImage.stdout).slice(0, 300)}`,
    };
  }

  const remoteCmd = [
    "set -e",
    `test -x ${remotePython} || { echo '{"ok":false,"message":"Ambiente GPU ausente no volume. Rode install-volume.sh."}'; exit 10; }`,
    "export SPCONV_ALGO=native",
    "export ATTN_BACKEND=flash-attn",
    `export STUDIO_TRELLIS_ROOT=${remoteRoot}`,
    `export HF_HOME=${TRELLIS_VOLUME.hfHome}`,
    `export HUGGINGFACE_HUB_CACHE=${TRELLIS_VOLUME.hfHome}`,
    `export TRANSFORMERS_CACHE=${TRELLIS_VOLUME.hfHome}`,
    "export STUDIO_TRELLIS_SIMPLIFY=0.90",
    "export STUDIO_TRELLIS_TEXTURE=2048",
    "export PYTHONUNBUFFERED=1",
    hfToken ? `export HF_TOKEN=${JSON.stringify(hfToken)}` : "true",
    hfToken ? `export HUGGINGFACE_HUB_TOKEN=${JSON.stringify(hfToken)}` : "true",
    `${remotePython} ${remoteScript} --input ${remoteInput} --output ${remoteOutput}`,
  ].join(" && ");

  const infer = await ssh(input.session, keyPath, remoteCmd, input.timeoutMs);
  const payload = parseSidecarJson(infer.stdout);
  if (infer.code !== 0) {
    const message =
      (typeof payload?.message === "string" && payload.message) ||
      infer.stderr.trim() ||
      infer.stdout.trim() ||
      `Inferência remota saiu com código ${infer.code}.`;
    return { ok: false, message: message.slice(0, 500) };
  }

  const down = await scp(
    input.session,
    keyPath,
    `${dest}:${remoteOutput}`,
    input.outputFile,
    60_000,
  );
  if (down.code !== 0) {
    return { ok: false, message: `SCP do GLB falhou: ${(down.stderr || down.stdout).slice(0, 300)}` };
  }

  await ssh(input.session, keyPath, `rm -rf ${jobDir}`, 30_000).catch(() => undefined);

  const metrics =
    payload?.metrics && typeof payload.metrics === "object"
      ? (payload.metrics as TrellisSidecarMetrics)
      : undefined;
  return { ok: true, metrics };
}
