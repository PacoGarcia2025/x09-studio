import "server-only";

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { projectDirExists } from "@/lib/projects/fs.server";
import { ensureProjectDependencies } from "@/lib/publish/project-deps.server";
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
    const addedDeps = await ensureProjectDependencies(input.projectId);
    if (addedDeps.length > 0) {
      log.push(`Deps adicionadas ao package.json: ${addedDeps.join(", ")}`);
    }

    // NODE_ENV=production omite devDependencies (typescript/vite) — tsc some do PATH.
    await runNpm(["ci", "--prefer-offline", "--no-audit"], projectDir, log, {
      NODE_ENV: "development",
    });

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
