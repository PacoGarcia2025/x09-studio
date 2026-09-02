/**
 * Liga um 4090 no volume x09-trellis, instala o sidecar no disco, TERMINATE.
 * Nunca imprime tokens. Uso: node scripts/bootstrap-trellis-volume.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const API = "https://api.runpod.io/v2";
const IMAGE = "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04";
const VOLUME_ID = "64jtcws0m6";
const DATACENTER = "EU-RO-1";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error(".env.local ausente");
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    let value = trimmed.slice(i + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[trimmed.slice(0, i)] = value;
  }
  return env;
}

function run(bin, args, timeoutMs) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderr += text;
      process.stderr.write(text);
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Timeout ${bin}`));
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    });
  });
}

function sshFlags(keyPath) {
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
    `UserKnownHostsFile=${process.platform === "win32" ? "NUL" : "/dev/null"}`,
    "-o",
    "ConnectTimeout=20",
  ];
}

async function api(key, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const env = loadEnvLocal();
  const apiKey = env.STUDIO_RUNPOD_API_KEY || env.RUNPOD_API_KEY;
  if (!apiKey) throw new Error("STUDIO_RUNPOD_API_KEY ausente");
  const pubPath = resolve(process.cwd(), ".runpod-ssh/trellis_ed25519.pub");
  const keyPath = resolve(
    process.cwd(),
    env.STUDIO_RUNPOD_SSH_KEY || ".runpod-ssh/trellis_ed25519",
  );
  const pub = readFileSync(pubPath, "utf8").trim();
  const hf =
    env.HUGGINGFACE_API_KEY ||
    env.HF_TOKEN ||
    env.HUGGINGFACE_TOKEN ||
    env.HUGGINGFACE_HUB_TOKEN ||
    "";

  console.log("STAGE pack source");
  const srcDir = resolve(process.cwd(), ".tmp/TRELLIS");
  if (!existsSync(resolve(srcDir, "trellis"))) {
    throw new Error(
      "Clone local ausente. Rode: git clone --depth 1 https://github.com/microsoft/TRELLIS.git .tmp/TRELLIS",
    );
  }
  const tarball = resolve(process.cwd(), ".tmp/trellis-src.tar");
  const packArgs = [
    "-cf",
    tarball,
    "--exclude=.git",
    "-C",
    resolve(process.cwd(), ".tmp"),
    "TRELLIS",
  ];
  if (existsSync(resolve(process.cwd(), ".tmp/src-deps/utils3d"))) {
    packArgs.push("src-deps");
  }
  const pack = await run("tar", packArgs, 180_000);
  if (pack.code !== 0) throw new Error("tar do código-fonte falhou");

  console.log("STAGE create-pod volume", VOLUME_ID, DATACENTER);
  const createDeadline = Date.now() + 12 * 60 * 1000;
  let created = null;
  while (Date.now() < createDeadline) {
    try {
      created = await api(apiKey, "POST", "/pods", {
        name: `x09-trellis-bootstrap-${Date.now()}`,
        image: IMAGE,
        cloud: "SECURE",
        gpu: { id: "NVIDIA GeForce RTX 4090", count: 1, minCudaVersion: "12.4" },
        dataCenterIds: [DATACENTER],
        disk: 40,
        ports: ["22/tcp"],
        startSsh: true,
        env: {
          PUBLIC_KEY: pub,
          NVIDIA_VISIBLE_DEVICES: "all",
        },
        mounts: { network: [{ volumeId: VOLUME_ID, path: "/workspace" }] },
      });
      break;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/not enough free GPUs|no longer any instances|insufficient/i.test(message)) {
        throw err;
      }
      console.log("CAPACITY retry in 20s");
      await sleep(20_000);
    }
  }
  if (!created) throw new Error("Sem 4090 livre em EU-RO-1 neste momento.");
  const podId = created.id;
  createdPodId = podId;
  if (!podId) throw new Error("create pod sem id");
  console.log("POD", podId, created.status || "");

  let ssh = null;
  const deadline = Date.now() + 12 * 60 * 1000;
  while (Date.now() < deadline) {
    const snap = await api(apiKey, "GET", `/pods/${podId}`);
    const status = snap.status;
    const direct = snap.ssh?.direct;
    console.log("WAIT", status, direct?.host ? `ssh ${direct.port}` : "no-ssh");
    if (status === "ERROR" || status === "TERMINATED") {
      throw new Error(`pod ${status}`);
    }
    if (status === "RUNNING" && direct?.host && direct?.port) {
      ssh = {
        host: direct.host,
        port: Number(direct.port),
        username: direct.username || "root",
      };
      break;
    }
    await sleep(8000);
  }
  if (!ssh) throw new Error("Timeout à espera do SSH");

  const dest = `${ssh.username}@${ssh.host}`;
  const baseSsh = [...sshFlags(keyPath), "-p", String(ssh.port), dest];
  const baseScp = [...sshFlags(keyPath), "-P", String(ssh.port)];

  async function remote(command, timeoutMs) {
    return run("ssh", [...baseSsh, command], timeoutMs);
  }

  for (let i = 0; i < 12; i += 1) {
    try {
      const ping = await remote("echo ssh-ok && nvidia-smi -L | head -1", 60_000);
      if (ping.code === 0) break;
    } catch (err) {
      console.log("WAIT ssh-retry", err instanceof Error ? err.message : err);
    }
    if (i === 11) throw new Error("SSH ainda recusa conexões");
    await sleep(8000);
  }

  const inspect = await remote(
    "echo '---workspace---'; ls -la /workspace; echo '---ready---'; cat /workspace/.x09-trellis-ready 2>/dev/null || echo missing; echo '---venv---'; test -x /workspace/trellis-env/bin/python && echo venv-yes || echo venv-no; echo '---flexi---'; test -f /workspace/TRELLIS/trellis/representations/mesh/flexicubes/flexicubes.py && echo flexi-yes || echo flexi-no; echo '---git---'; test -d /workspace/TRELLIS/.git && echo trellis-yes || echo trellis-no",
    30_000,
  );
  if (inspect.code !== 0) {
    throw new Error("inspect falhou");
  }

  const venvOk = /venv-yes/.test(inspect.stdout);

  console.log("STAGE extract source");
  const upSrc = await run(
    "scp",
    [...baseScp, tarball, `${dest}:/tmp/trellis-src.tar`],
    180_000,
  );
  if (upSrc.code !== 0) throw new Error("scp do código-fonte falhou");
  const extract = await remote(
    "rm -rf /workspace/TRELLIS /workspace/src-deps && tar -xf /tmp/trellis-src.tar -C /workspace && rm -f /tmp/trellis-src.tar && test -d /workspace/TRELLIS/trellis && test -f /workspace/TRELLIS/trellis/representations/mesh/flexicubes/flexicubes.py && test -d /workspace/src-deps/utils3d",
    120_000,
  );
  if (extract.code !== 0) throw new Error("extract do código-fonte falhou");

  if (venvOk) {
    console.log("STAGE pin-transformers (venv já existe)");
    const pin = await remote(
      "/workspace/trellis-env/bin/python -m pip install 'transformers>=4.46.3,<4.50'",
      10 * 60 * 1000,
    );
    if (pin.code !== 0) throw new Error(`pin transformers saiu ${pin.code}`);
  } else {
    console.log("STAGE install (30-90 min)");
    const up = await run(
      "scp",
      [
        ...baseScp,
        resolve(process.cwd(), "services/trellis-worker/install-volume.sh"),
        `${dest}:/tmp/install-volume.sh`,
      ],
      60_000,
    );
    if (up.code !== 0) throw new Error("scp install falhou");
    const hfExportInstall = hf
      ? `export HF_TOKEN=${JSON.stringify(hf)}; export HUGGINGFACE_HUB_TOKEN=${JSON.stringify(hf)};`
      : "";
    const install = await remote(
      `sed -i 's/\\r$//' /tmp/install-volume.sh; ${hfExportInstall} bash /tmp/install-volume.sh`,
      100 * 60 * 1000,
    );
    if (install.code !== 0) throw new Error(`install saiu ${install.code}`);
  }

  console.log("STAGE probe");
  const upRun = await run(
    "scp",
    [
      ...baseScp,
      resolve(process.cwd(), "services/trellis-worker/run.py"),
      `${dest}:/tmp/run.py`,
    ],
    30_000,
  );
  if (upRun.code !== 0) throw new Error("scp run.py falhou");
  const hfExport = hf
    ? `export HF_TOKEN=${JSON.stringify(hf)}; export HUGGINGFACE_HUB_TOKEN=${JSON.stringify(hf)};`
    : "";
  const probe = await remote(
    `${hfExport} export STUDIO_TRELLIS_ROOT=/workspace/TRELLIS; export HF_HOME=/workspace/hf-cache; /workspace/trellis-env/bin/python /tmp/run.py --probe`,
    10 * 60 * 1000,
  );
  if (probe.code !== 0) {
    await remote("rm -f /workspace/.x09-trellis-ready", 15_000);
    throw new Error(`probe saiu ${probe.code}`);
  }
  console.log("PROBE_OK");
}

let createdPodId = null;
main()
  .catch((err) => {
    console.error("FAIL", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!createdPodId) return;
    try {
      const env = loadEnvLocal();
      const apiKey = env.STUDIO_RUNPOD_API_KEY || env.RUNPOD_API_KEY;
      console.log("STAGE terminate", createdPodId);
      await api(apiKey, "POST", `/pods/${createdPodId}/action`, {
        action: "terminate",
      });
      console.log("TERMINATED");
    } catch (e) {
      console.error("cleanup fail", e instanceof Error ? e.message : e);
    }
  });
