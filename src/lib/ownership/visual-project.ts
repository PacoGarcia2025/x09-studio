import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicError } from "@/lib/http/errors";

export type VisualProjectRow = {
  id: string;
  user_id: string;
  name: string;
  files: Record<string, string> | null;
  chat_history: unknown;
  app_spec: unknown;
  published_url: string | null;
  publish_status: string | null;
  last_deploy_id: string | null;
  github_repo_full_name: string | null;
};

export async function requireOwnedVisualProject(
  projectId: string,
  userId: string,
): Promise<VisualProjectRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("visual_projects")
    .select(
      "id, user_id, name, files, chat_history, app_spec, published_url, publish_status, last_deploy_id, github_repo_full_name",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new PublicError("Não foi possível carregar o projeto.", 500);
  }
  if (!data || data.user_id !== userId) {
    throw new PublicError("Projeto não encontrado.", 404);
  }

  return data as VisualProjectRow;
}
