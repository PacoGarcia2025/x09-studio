import { spawn } from "node:child_process";
import { z } from "zod";
import { getLlmProvider } from "@/lib/llm/provider";
import type { LlmProvider } from "@/lib/llm/types";
import type { FixAppliedItem } from "@/lib/pipeline/fix-schema";
import type { VerifyIssue } from "@/lib/pipeline/verify-schema";
import {
  deleteProjectFile,
  fileExists,
  readProjectFile,
  writeProjectFile,
} from "@/lib/projects/fs.server";
import { getProjectDir } from "@/lib/projects/paths";

/**
 * Auto Fix aplica correções SOMENTE a partir de issues do Verify Report.
 * Não roda tsc/lint/build nem escaneia o projeto em busca de erros novos.
 * Pode ler o arquivo citado na issue apenas para aplicar o patch.
 */

const fileContentSchema = z.object({
  content: z.string().min(1).max(120_000),
});

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Resposta da IA não é JSON válido");
  }
}

async function llmFileContent(
  provider: LlmProvider,
  system: string,
  user: string,
): Promise<string> {
  const result = await provider.complete({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.15,
    maxOutputTokens: 8192,
  });
  return fileContentSchema.parse(extractJson(result.text)).content;
}

async function upsertEnvKey(
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
  return envPath;
}

function assertFixInstallCommand(packageName: string): string {
  if (!/^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i.test(packageName)) {
    throw new Error(`packageName inválido: ${packageName}`);
  }
  return `npm install ${packageName}`;
}

async function runShell(
  projectId: string,
  command: string,
  timeoutMs = 180_000,
): Promise<void> {
  const cwd = getProjectDir(projectId);
  const isWin = process.platform === "win32";
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      windowsHide: isWin,
      env: { ...process.env, CI: "1" },
    });
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Timeout: ${command}`));
    }, timeoutMs);
    child.stderr?.on("data", (d: Buffer) => {
      err += d.toString();
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Falha (${code}): ${err.slice(-2000) || command}`));
    });
  });
}

const EDIT_SYSTEM = `Você corrige UMA issue do Verify Report do X09 Studio.
Responda APENAS JSON: { "content": string } com o arquivo completo corrigido.
- Corrija SOMENTE o problema descrito na issue.
- Não invente outros arquivos ou refactors.
- Não descubra erros novos — use só os dados da issue.`;

/**
 * Aplica correções para issues do relatório (máx. por attempt).
 */
export async function applyFixesFromReportIssues(
  projectId: string,
  issues: VerifyIssue[],
  options?: { maxFixes?: number },
): Promise<{
  applied: FixAppliedItem[];
  filesChanged: string[];
  fixesApplied: number;
  fixesFailed: number;
}> {
  const maxFixes = options?.maxFixes ?? 8;
  const targets = issues.slice(0, maxFixes);
  const applied: FixAppliedItem[] = [];
  const filesChanged = new Set<string>();
  let fixesApplied = 0;
  let fixesFailed = 0;

  let provider: LlmProvider | null = null;
  const getProvider = () => {
    if (!provider) provider = getLlmProvider();
    return provider;
  };

  for (const issue of targets) {
    const target = issue.fixTarget;
    if (!target || target.kind === "unknown") {
      applied.push({
        issueId: issue.id,
        kind: "unknown",
        path: issue.file ?? null,
        ok: false,
        message: "Sem fixTarget acionável",
      });
      fixesFailed += 1;
      continue;
    }

    try {
      switch (target.kind) {
        case "edit_file":
        case "create_file": {
          const path = target.path ?? issue.file;
          if (!path) throw new Error("path ausente na issue");

          let existing: string | null = null;
          if (target.kind === "edit_file" && (await fileExists(projectId, path))) {
            existing = await readProjectFile(projectId, path);
          }

          const user = JSON.stringify({
            action: target.kind,
            path,
            issue: {
              code: issue.code,
              message: issue.message,
              suggestion: issue.suggestion,
              severity: issue.severity,
              category: issue.category,
              line: issue.line ?? null,
              detail: target.detail ?? null,
            },
            existingContent: existing?.slice(0, 14000) ?? null,
          });

          const content = await llmFileContent(getProvider(), EDIT_SYSTEM, user);
          await writeProjectFile(projectId, path, content);
          filesChanged.add(path);
          applied.push({
            issueId: issue.id,
            kind: target.kind,
            path,
            ok: true,
            message: `${target.kind} → ${path}`,
          });
          fixesApplied += 1;
          break;
        }
        case "delete_file": {
          const path = target.path ?? issue.file;
          if (!path) throw new Error("path ausente");
          await deleteProjectFile(projectId, path);
          filesChanged.add(path);
          applied.push({
            issueId: issue.id,
            kind: "delete_file",
            path,
            ok: true,
            message: `delete → ${path}`,
          });
          fixesApplied += 1;
          break;
        }
        case "set_env": {
          const key = target.envKey;
          if (!key) throw new Error("envKey ausente");
          const value =
            target.detail && !target.detail.includes(" ")
              ? target.detail
              : "REPLACE_ME";
          const path = await upsertEnvKey(projectId, key, value);
          filesChanged.add(path);
          applied.push({
            issueId: issue.id,
            kind: "set_env",
            path,
            ok: true,
            message: `env ${key} atualizado`,
          });
          fixesApplied += 1;
          break;
        }
        case "install_package": {
          const pkg = target.packageName;
          if (!pkg) throw new Error("packageName ausente");
          const cmd = assertFixInstallCommand(pkg);
          await runShell(projectId, cmd);
          filesChanged.add("package.json");
          applied.push({
            issueId: issue.id,
            kind: "install_package",
            path: "package.json",
            ok: true,
            message: cmd,
          });
          fixesApplied += 1;
          break;
        }
        case "run_command": {
          const detail = (target.detail ?? "").trim();
          if (detail !== "npm install" && detail !== "npm ci") {
            throw new Error(`Comando Fix não permitido: ${detail}`);
          }
          await runShell(projectId, detail);
          applied.push({
            issueId: issue.id,
            kind: "run_command",
            path: null,
            ok: true,
            message: detail,
          });
          fixesApplied += 1;
          break;
        }
        case "sql_migration": {
          const path =
            target.path ??
            `supabase/migrations/${Date.now()}_fix.sql`;
          const user = JSON.stringify({
            action: "sql_migration",
            path,
            issue: {
              code: issue.code,
              message: issue.message,
              suggestion: issue.suggestion,
              detail: target.detail ?? null,
            },
          });
          const content = await llmFileContent(
            getProvider(),
            `Gere UMA migration SQL. Responda APENAS JSON { "content": string }.
Corrija só o problema da issue. SQL Postgres/Supabase.`,
            user,
          );
          await writeProjectFile(projectId, path, content);
          filesChanged.add(path);
          applied.push({
            issueId: issue.id,
            kind: "sql_migration",
            path,
            ok: true,
            message: `sql → ${path}`,
          });
          fixesApplied += 1;
          break;
        }
        default: {
          const _x: never = target.kind;
          throw new Error(`kind desconhecido: ${_x}`);
        }
      }
    } catch (err) {
      fixesFailed += 1;
      applied.push({
        issueId: issue.id,
        kind: target.kind,
        path: target.path ?? issue.file ?? null,
        ok: false,
        message: err instanceof Error ? err.message : "Falha ao aplicar fix",
      });
    }
  }

  return {
    applied,
    filesChanged: [...filesChanged],
    fixesApplied,
    fixesFailed,
  };
}
