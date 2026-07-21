import fs from "node:fs";
import path from "node:path";

function dirExists(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Raiz do app no disco (repo ou standalone). */
export function getAppRoot(): string {
  const explicit = process.env.STUDIO_APP_ROOT?.trim();
  if (
    explicit &&
    dirExists(path.join(path.resolve(explicit), "templates", "react-supabase-starter"))
  ) {
    return path.resolve(explicit);
  }

  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../.."),
  ];

  for (const root of candidates) {
    if (dirExists(path.join(root, "templates", "react-supabase-starter"))) {
      return root;
    }
  }

  return explicit ? path.resolve(explicit) : process.cwd();
}

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

/** Raiz dos sites estáticos publicados — Nginx serve /var/www/html/clients/{slug}. */
export function getStaticClientsRoot(): string {
  const root = process.env.STUDIO_STATIC_CLIENTS_ROOT?.trim();
  return root ? path.resolve(root) : "/var/www/html/clients";
}

/** Template oficial versionado no repositório. */
export function getTemplateDir(templateId = "react-supabase-starter"): string {
  return path.join(getAppRoot(), "templates", templateId);
}
