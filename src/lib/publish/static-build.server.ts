import "server-only";

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { projectDirExists } from "@/lib/projects/fs.server";
import { ensureProjectDependencies } from "@/lib/publish/project-deps.server";
import { repairUndeclaredJsxImports } from "@/lib/projects/import-graph.server";
import { getProjectDir, getStaticClientsRoot } from "@/lib/projects/paths";

const execFileAsync = promisify(execFile);

export type StaticBuildResult = {
  ok: boolean;
  log: string[];
  outputDir?: string;
  error?: string;
};

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function runNpm(
  args: string[],
  cwd: string,
  log: string[],
  envOverrides?: Record<string, string | undefined>,
): Promise<void> {
  log.push(`$ npm ${args.join(" ")}`);
  const env = { ...process.env, ...envOverrides };
  await execFileAsync("npm", args, {
    cwd,
    timeout: 300_000,
    env,
    shell: process.platform === "win32",
    maxBuffer: 10 * 1024 * 1024,
  });
}

/**
 * Gera build estático Vite (SSG) e publica em STUDIO_STATIC_CLIENTS_ROOT/{slug}.
 * Nginx serve a pasta com try_files + fallback SPA index.html.
 */
export async function buildStaticSiteForPublish(input: {
  projectId: string;
  slug: string;
}): Promise<StaticBuildResult> {
  const log: string[] = [];

  if (!(await projectDirExists(input.projectId))) {
    return {
      ok: false,
      log,
      error: "Projeto não encontrado no disco (STUDIO_PROJECTS_ROOT).",
    };
  }

  const projectDir = getProjectDir(input.projectId);
  const distDir = path.join(projectDir, "dist");
  const outDir = path.join(getStaticClientsRoot(), input.slug);

  try {
    const repairedFiles = await repairUndeclaredJsxImports(input.projectId);
    if (repairedFiles.length > 0) {
      log.push(`Imports JSX corrigidos: ${repairedFiles.join(", ")}`);
    }

    const addedDeps = await ensureProjectDependencies(input.projectId);
    if (addedDeps.length > 0) {
      log.push(`Deps adicionadas ao package.json: ${addedDeps.join(", ")}`);
    }

    const lockPath = path.join(projectDir, "package-lock.json");
    const hasLock = await fs
      .stat(lockPath)
      .then((st) => st.isFile())
      .catch(() => false);

    // Projetos gerados podem ter package.json alterado (ensureProjectDependencies) com lock
    // desatualizado — npm ci falha com EUSAGE. Preferimos npm install no publish.
    const installCmd =
      addedDeps.length > 0 || !hasLock
        ? (["install", "--no-audit", "--prefer-offline"] as const)
        : (["ci", "--prefer-offline", "--no-audit"] as const);

    const tryNpmCi =
      installCmd[0] === "ci"
        ? async () => {
            log.push("Instalando deps via npm ci…");
            await runNpm([...installCmd], projectDir, log, {
              NODE_ENV: "development",
            });
          }
        : null;

    if (tryNpmCi) {
      try {
        await tryNpmCi();
      } catch (ciErr) {
        const msg = ciErr instanceof Error ? ciErr.message : String(ciErr);
        if (/EUSAGE|package-lock\.json.*sync|Missing:/i.test(msg)) {
          log.push(
            "npm ci falhou (lock desatualizado) — regenerando com npm install…",
          );
          await runNpm(
            ["install", "--no-audit", "--prefer-offline"],
            projectDir,
            log,
            { NODE_ENV: "development" },
          );
        } else {
          throw ciErr;
        }
      }
    } else {
      log.push(
        "Instalando deps (package.json alterado ou lock ausente)…",
      );
      await runNpm([...installCmd], projectDir, log, {
        NODE_ENV: "development",
      });
    }

    try {
      await runNpm(["run", "build"], projectDir, log, {
        NODE_ENV: "production",
      });
    } catch (buildErr) {
      log.push("npm run build falhou — tentando vite build direto…");
      await runNpm(["exec", "--", "vite", "build"], projectDir, log, {
        NODE_ENV: "production",
      });
      if (buildErr instanceof Error) log.push(buildErr.message);
    }

    const distStat = await fs.stat(distDir).catch(() => null);
    if (!distStat?.isDirectory()) {
      return {
        ok: false,
        log,
        error: "Build concluiu sem pasta dist/ — verifique scripts do Vite.",
      };
    }

    await fs.rm(outDir, { recursive: true, force: true });
    await copyDir(distDir, outDir);
    log.push(`Artefatos estáticos em ${outDir}`);

    return { ok: true, log, outputDir: outDir };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Falha desconhecida no build estático";
    log.push(message);
    return { ok: false, log, error: message };
  }
}
