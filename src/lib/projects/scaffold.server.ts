import fs from "node:fs/promises";
import path from "node:path";
import { getProjectDir, getTemplateDir } from "@/lib/projects/paths";
import { projectDirExists } from "@/lib/projects/fs.server";
import { templateScaffoldId } from "@/lib/skills/templates/skill";

const DEFAULT_TEMPLATE = "react-supabase-starter";

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
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

/** Garante scaffold; útil para projetos criados antes do Sprint 3. */
export async function ensureProjectScaffold(
  projectId: string,
  options?: { briefPrompt?: string | null },
) {
  const templateId = options?.briefPrompt?.trim()
    ? templateScaffoldId(options.briefPrompt)
    : DEFAULT_TEMPLATE;
  return scaffoldProject(projectId, { templateId });
}
