export type ProjectStatus =
  | "draft"
  | "generating"
  | "ready"
  | "error"
  | "published";

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  brief_prompt?: string | null;
  created_at: string;
  updated_at: string;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 2 && slug.length <= 48 && SLUG_RE.test(slug);
}
