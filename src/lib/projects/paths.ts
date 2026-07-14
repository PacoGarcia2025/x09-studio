import path from "node:path";

/**
 * Raiz dos projetos no disco — obrigatório via env.
 * Em produção VPS: /var/lib/x09-studio/projects
 * Em dev: defina no .env.local (ex.: caminho absoluto local).
 */
export function getProjectsRoot(): string {
  const root = process.env.STUDIO_PROJECTS_ROOT?.trim();
  if (!root) {
    throw new Error(
      "STUDIO_PROJECTS_ROOT não configurado. Defina no .env / .env.local.",
    );
  }
  return path.resolve(root);
}

export function getProjectDir(projectId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
    throw new Error("projectId inválido");
  }
  return path.join(getProjectsRoot(), projectId);
}

/** Template oficial versionado no repositório. */
export function getTemplateDir(templateId = "react-supabase-starter"): string {
  return path.join(process.cwd(), "templates", templateId);
}
