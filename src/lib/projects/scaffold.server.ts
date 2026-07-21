import fs from "node:fs/promises";
import path from "node:path";
import { isImobiliaria360 } from "@/lib/skills/detect";
import { templateScaffoldId } from "@/lib/skills/templates/skill";
import {
  fileExists,
  projectDirExists,
  writeProjectFile,
} from "@/lib/projects/fs.server";
import { getProjectDir, getTemplateDir } from "@/lib/projects/paths";

const DEFAULT_TEMPLATE = "react-supabase-starter";

const IMOB_MERGE_DIRS = ["src/pages", "src/components", "src/lib"] as const;

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listFilesRecursive(
  absoluteDir: string,
  relativeDir = "",
): Promise<string[]> {
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const rel = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursive(path.join(absoluteDir, entry.name), rel)));
    } else {
      out.push(rel.replace(/\\/g, "/"));
    }
  }
  return out;
}

/**
 * Copia arquivos ausentes do template alvo (ex.: ListingsPage) sem sobrescrever
 * páginas já geradas pelo Builder — corrige preview quebrado mid-build.
 */
export async function mergeMissingTemplateFiles(
  projectId: string,
  templateId: string,
): Promise<string[]> {
  const templateDir = getTemplateDir(templateId);
  const merged: string[] = [];

  for (const dir of IMOB_MERGE_DIRS) {
    const abs = path.join(templateDir, dir);
    if (!(await pathExists(abs))) continue;

    const files = await listFilesRecursive(abs, dir);
    for (const rel of files) {
      if (await fileExists(projectId, rel)) continue;
      const src = path.join(templateDir, rel);
      if (!(await pathExists(src))) continue;
      const content = await fs.readFile(src, "utf8");
      await writeProjectFile(projectId, rel, content);
      merged.push(rel);
    }
  }

  if (merged.length > 0 && (await fileExists(projectId, "package.json"))) {
    try {
      const [tplPkgRaw, projPkgRaw] = await Promise.all([
        fs.readFile(path.join(templateDir, "package.json"), "utf8"),
        fs.readFile(path.join(getProjectDir(projectId), "package.json"), "utf8"),
      ]);
      const tplPkg = JSON.parse(tplPkgRaw) as {
        dependencies?: Record<string, string>;
      };
      const projPkg = JSON.parse(projPkgRaw) as {
        dependencies?: Record<string, string>;
      };
      projPkg.dependencies = {
        ...(projPkg.dependencies ?? {}),
        ...(tplPkg.dependencies ?? {}),
      };
      await writeProjectFile(
        projectId,
        "package.json",
        `${JSON.stringify(projPkg, null, 2)}\n`,
      );
    } catch {
      // package.json merge best-effort
    }
  }

  return merged;
}

/**
 * Copia o template oficial para STUDIO_PROJECTS_ROOT/{projectId}.
 * Idempotente: se a pasta já existir e tiver package.json, não sobrescreve.
 */
export async function scaffoldProject(
  projectId: string,
  options?: { templateId?: string; force?: boolean },
): Promise<{ created: boolean; projectDir: string }> {
  const templateId = options?.templateId ?? DEFAULT_TEMPLATE;
  const templateDir = getTemplateDir(templateId);
  const projectDir = getProjectDir(projectId);

  if (!(await pathExists(templateDir))) {
    throw new Error(`Template não encontrado: ${templateId}`);
  }

  const exists = await projectDirExists(projectId);
  if (exists && !options?.force) {
    const pkg = path.join(projectDir, "package.json");
    if (await pathExists(pkg)) {
      return { created: false, projectDir };
    }
  }

  await fs.mkdir(path.dirname(projectDir), { recursive: true });

  if (exists && options?.force) {
    await fs.rm(projectDir, { recursive: true, force: true });
  }

  await fs.cp(templateDir, projectDir, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      return base !== "node_modules" && base !== "dist" && base !== ".git";
    },
  });

  return { created: true, projectDir };
}

/** Garante scaffold + arquivos ausentes do template correto para o brief. */
export async function ensureProjectScaffold(
  projectId: string,
  options?: { briefPrompt?: string | null },
) {
  const brief = options?.briefPrompt?.trim() ?? "";
  const templateId = brief ? templateScaffoldId(brief) : DEFAULT_TEMPLATE;
  const result = await scaffoldProject(projectId, { templateId });

  if (brief && isImobiliaria360(brief) && templateId === "imobiliaria-360-starter") {
    await mergeMissingTemplateFiles(projectId, templateId);
  }

  return result;
}
