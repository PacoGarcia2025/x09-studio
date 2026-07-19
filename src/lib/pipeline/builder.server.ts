import { spawn } from "node:child_process";
import path from "node:path";
import type { LlmProvider } from "@/lib/llm/types";
import { resolveCommandPlan } from "@/lib/pipeline/commands.allowlist";
import {
  generateTaskPayload,
  LANDING_APP_TSX,
} from "@/lib/pipeline/task-content.server";
import type { PlanTaskType } from "@/lib/pipeline/plan-schema";
import {
  deleteProjectFile,
  fileExists,
  readProjectFile,
  writeProjectFile,
} from "@/lib/projects/fs.server";
import { getProjectDir } from "@/lib/projects/paths";
import { ensureProjectScaffold } from "@/lib/projects/scaffold.server";

export type BuilderTaskInput = {
  type: PlanTaskType;
  title: string;
  instruction: string;
  path?: string | null;
};

export type BuilderApplyResult = {
  log: string;
};

async function runSingleCommand(
  projectId: string,
  command: string,
): Promise<string> {
  const cwd = getProjectDir(projectId);
  const isWin = process.platform === "win32";

  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      windowsHide: isWin,
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Timeout no comando: ${command}`));
    }, 180_000);

    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const out = `${stdout}\n${stderr}`.trim().slice(-4000);
      if (code === 0) resolve(out || `OK: ${command}`);
      else reject(new Error(`Comando falhou (${code}): ${out || command}`));
    });
  });
}

async function runCommand(
  projectId: string,
  rawCommand: string,
): Promise<string> {
  const { run, skipped, ignored } = resolveCommandPlan(rawCommand);
  const notes: string[] = [];

  if (ignored.length > 0) {
    notes.push(`Ignorado (não permitido): ${ignored.join(", ")}`);
  }
  if (skipped.length > 0) {
    notes.push(
      `Pulado (preview usa Sandpack, sem build local): ${skipped.join(", ")}`,
    );
  }

  if (run.length === 0) {
    return (
      notes.join(" | ") ||
      `Comando ignorado: "${rawCommand.trim()}". Sem impacto na geração.`
    );
  }

  const logs: string[] = [...notes];
  for (const cmd of run) {
    logs.push(await runSingleCommand(projectId, cmd));
  }
  return logs.join("\n\n");
}

async function upsertEnv(
  projectId: string,
  key: string,
  value: string,
): Promise<string> {
  const envPath = ".env";
  let current = "";
  if (await fileExists(projectId, envPath)) {
    current = await readProjectFile(projectId, envPath);
  }
  const lines = current ? current.split(/\r?\n/) : [];
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  const content = `${next.filter((l, i) => !(l === "" && i === next.length - 1)).join("\n")}\n`;
  await writeProjectFile(projectId, envPath, content);
  return `env ${key} atualizado em ${envPath}`;
}

function isHomePagePath(filePath: string): boolean {
  const p = filePath.replace(/\\/g, "/");
  return /\/pages\/HomePage\.tsx?$/i.test(p) || p === "src/pages/HomePage.tsx";
}

/**
 * Aplica UMA task no FileSystem do projeto.
 * O LLM só gera o payload; o Builder escreve no disco.
 */
export async function applyBuilderTask(
  provider: LlmProvider,
  projectId: string,
  projectName: string,
  task: BuilderTaskInput,
): Promise<BuilderApplyResult> {
  await ensureProjectScaffold(projectId);

  const existing =
    task.path && (task.type === "update_file" || task.type === "create_file")
      ? (await fileExists(projectId, task.path))
        ? await readProjectFile(projectId, task.path)
        : null
      : null;

  const payload = await generateTaskPayload(provider, task, {
    projectName,
    existingFileContent: existing,
  });

  switch (payload.kind) {
    case "file": {
      if (!task.path) throw new Error("path obrigatório");
      await writeProjectFile(projectId, task.path, payload.content);

      let log = `${task.type} → ${task.path} (${payload.content.length} chars)`;

      // Landing: remove o chrome "Meu App / Início / Entrar" do template.
      if (isHomePagePath(task.path)) {
        await writeProjectFile(projectId, "src/App.tsx", LANDING_APP_TSX);
        log += " + App.tsx sem AppShell";
      }

      return { log };
    }
    case "delete": {
      if (!task.path) throw new Error("path obrigatório");
      await deleteProjectFile(projectId, task.path);
      return { log: `delete_file → ${task.path}` };
    }
    case "command": {
      const out = await runCommand(projectId, payload.command);
      return { log: `run_command → ${payload.command}\n${out}` };
    }
    case "env": {
      const msg = await upsertEnv(projectId, payload.key, payload.value);
      return { log: msg };
    }
    case "sql": {
      const stamp = new Date()
        .toISOString()
        .replace(/[-:TZ.]/g, "")
        .slice(0, 14);
      const rel = path
        .join("supabase", "migrations", `${stamp}_${payload.filename}`)
        .replace(/\\/g, "/");
      await writeProjectFile(projectId, rel, payload.content);
      return { log: `sql_migration → ${rel}` };
    }
    default: {
      const _x: never = payload;
      throw new Error(`Payload desconhecido: ${JSON.stringify(_x)}`);
    }
  }
}
