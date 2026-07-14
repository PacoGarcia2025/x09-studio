"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidSlug, slugify, type Project } from "@/lib/projects/types";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null as null };
  }

  return { supabase, user };
}

async function ensureWorkspace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: existing } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: userId, name: "Meu workspace" })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Não foi possível criar workspace");
  }

  return created.id as string;
}

export async function listProjects(): Promise<Project[]> {
  const { supabase, user } = await requireUser();
  if (!user) return [];

  const { data: workspaces, error: wsError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id);

  if (wsError) {
    console.error("listProjects workspaces", wsError.message);
    return [];
  }

  const workspaceIds = (workspaces ?? []).map((w) => w.id);
  if (workspaceIds.length === 0) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("id, workspace_id, name, slug, status, created_at, updated_at")
    .in("workspace_id", workspaceIds)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("listProjects", error.message);
    return [];
  }

  return (data ?? []) as Project[];
}

export async function createProject(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim().toLowerCase();

  if (!name) {
    return { ok: false, error: "Informe o nome do projeto." };
  }

  if (!slug) slug = slugify(name);
  if (!isValidSlug(slug)) {
    return {
      ok: false,
      error: "Slug inválido. Use letras minúsculas, números e hífens.",
    };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, error: "Faça login para criar um projeto." };
  }

  try {
    const workspaceId = await ensureWorkspace(supabase, user.id);

    const { data, error } = await supabase
      .from("projects")
      .insert({
        workspace_id: workspaceId,
        name,
        slug,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Já existe um projeto com este slug." };
      }
      return { ok: false, error: error.message };
    }

    revalidatePath("/projects");
    redirect(`/projects/${data.id}`);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao criar projeto",
    };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
