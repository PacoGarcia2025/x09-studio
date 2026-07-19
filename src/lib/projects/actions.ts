"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scaffoldProject } from "@/lib/projects/scaffold.server";
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

    try {
      await scaffoldProject(data.id);
    } catch (scaffoldError) {
      await supabase.from("projects").delete().eq("id", data.id);
      return {
        ok: false,
        error:
          scaffoldError instanceof Error
            ? `Falha ao criar arquivos do projeto: ${scaffoldError.message}`
            : "Falha ao criar arquivos do projeto no disco",
      };
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

function nameFromPrompt(prompt: string): string {
  const cleaned = prompt
    .replace(/[^a-zA-ZÀ-ÿ0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const stop = new Set([
    "crie",
    "criar",
    "uma",
    "um",
    "para",
    "o",
    "a",
    "de",
    "da",
    "do",
    "que",
    "com",
    "na",
    "no",
    "em",
    "meu",
    "minha",
    "landing",
    "page",
  ]);
  const words = cleaned
    .split(" ")
    .filter((w) => w.length > 1 && !stop.has(w.toLowerCase()))
    .slice(0, 4);
  const name = words.join(" ").slice(0, 56);
  return name || "Novo projeto";
}

/**
 * Cria projeto + scaffold rápido (sem LLM).
 * O plano/build rodam no editor para evitar timeout em /projects/new.
 */
export async function createProjectFromPrompt(
  prompt: string,
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  try {
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      return {
        ok: false,
        error: "Descreva o projeto com pelo menos 3 caracteres.",
      };
    }

    const { supabase, user } = await requireUser();
    if (!user) return { ok: false, error: "Faça login para criar um projeto." };

    const workspaceId = await ensureWorkspace(supabase, user.id);
    const name = nameFromPrompt(trimmed);
    const baseSlug = slugify(name) || "novo-projeto";

    let created: { id: string } | null = null;
    for (let attempt = 0; attempt < 6 && !created; attempt += 1) {
      const suffix =
        attempt === 0 ? "" : `-${Date.now().toString(36).slice(-4)}${attempt}`;
      const slug = `${baseSlug.slice(0, Math.max(8, 48 - suffix.length))}${suffix}`;
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

      if (!error && data) created = data;
      else if (error?.code !== "23505") {
        return { ok: false, error: error?.message ?? "Falha ao criar projeto." };
      }
    }

    if (!created) {
      return { ok: false, error: "Não foi possível criar um nome único." };
    }

    try {
      await scaffoldProject(created.id);
    } catch (error) {
      await supabase.from("projects").delete().eq("id", created.id);
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao criar arquivos do projeto.",
      };
    }

    await supabase
      .from("projects")
      .update({ status: "generating" })
      .eq("id", created.id);

    revalidatePath("/projects");
    return { ok: true, projectId: created.id };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro inesperado ao criar o projeto.",
    };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
