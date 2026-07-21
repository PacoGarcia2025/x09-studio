"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  buildProjectSubdomainHost,
  buildProjectSubdomainUrl,
  isLegacyPublishedUrl,
  isSubdomainPublishReady,
  resolveProjectPublishUrl,
  resolvePublicShareUrl,
} from "@/lib/projects/publish-url";
import { getProjectPublishReadiness } from "@/lib/projects/publish-readiness.server";

function publicSiteUrl(slug: string): string {
  return buildProjectSubdomainUrl(slug);
}

async function assertOwner(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado", supabase };

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, slug, status, workspace_id, published_url, publish_status")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return { ok: false as const, error: "Projeto não encontrado", supabase };
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", project.workspace_id)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) {
    return { ok: false as const, error: "Sem permissão", supabase };
  }

  return { ok: true as const, supabase, project };
}

/**
 * Publica o projeto: marca como published e devolve URL pública imediata.
 * A rota /sites/[slug] serve o app ao vivo (Sandpack) sem auth.
 */
export async function publishProjectAction(
  projectId: string,
): Promise<
  | { ok: true; url: string; host: string }
  | { ok: false; error: string }
> {
  const gate = await assertOwner(projectId);
  if (!gate.ok) return { ok: false, error: gate.error };

  if (gate.project.status === "generating") {
    return {
      ok: false,
      error: "Aguarde a geração terminar antes de publicar.",
    };
  }

  const readiness = await getProjectPublishReadiness(projectId);
  if (!readiness.ready) {
    return {
      ok: false,
      error: readiness.reason ?? "Construa o app antes de publicar.",
    };
  }

  const url = isSubdomainPublishReady()
    ? publicSiteUrl(gate.project.slug)
    : resolvePublicShareUrl(gate.project.slug, gate.project.published_url);

  // Corrige URL legada /sites/{slug} gravada antes do subdomínio
  if (isLegacyPublishedUrl(gate.project.slug, gate.project.published_url)) {
    await gate.supabase
      .from("projects")
      .update({ published_url: url })
      .eq("id", projectId);
  }

  // published_url pode não existir se migration não rodou
  const update = await gate.supabase
    .from("projects")
    .update({
      status: "published",
      published_url: url,
      publish_status: "ready",
    })
    .eq("id", projectId);

  if (update.error && /published_url|publish_status/i.test(update.error.message)) {
    const fallback = await gate.supabase
      .from("projects")
      .update({ status: "published" })
      .eq("id", projectId);
    if (fallback.error) {
      return { ok: false, error: fallback.error.message };
    }
  } else if (update.error) {
    return { ok: false, error: update.error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/sites/${gate.project.slug}`);
  return {
    ok: true,
    url,
    host: buildProjectSubdomainHost(gate.project.slug),
  };
}
