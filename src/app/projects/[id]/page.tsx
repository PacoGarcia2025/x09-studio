import { notFound } from "next/navigation";
import { ProjectWorkspace } from "@/components/projects/ProjectWorkspace";
import { getLatestPlan } from "@/lib/pipeline/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autostart?: string; q?: string }>;
};

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { autostart, q } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  let project:
    | {
        id: string;
        name: string;
        slug: string;
        status: string;
        created_at: string;
        workspace_id: string;
        brief_prompt?: string | null;
        published_url?: string | null;
      }
    | null = null;

  {
    const withBrief = await supabase
      .from("projects")
      .select("id, name, slug, status, created_at, workspace_id, brief_prompt, published_url")
      .eq("id", id)
      .maybeSingle();

    if (withBrief.error && /brief_prompt|published_url/i.test(withBrief.error.message)) {
      const fallback = await supabase
        .from("projects")
        .select("id, name, slug, status, created_at, workspace_id, brief_prompt")
        .eq("id", id)
        .maybeSingle();
      project = fallback.data;
    } else {
      project = withBrief.data;
    }
  }

  if (!project) notFound();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", project.workspace_id)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) notFound();

  const latest = await getLatestPlan(project.id);
  const briefPrompt =
    q?.trim() || project.brief_prompt?.trim() || latest?.prompt || "";

  // Abre e já planeja: veio do Construir OU tem prompt salvo sem plano ainda.
  const shouldAutoStart =
    autostart === "1" || (Boolean(briefPrompt) && !latest);

  return (
    <ProjectWorkspace
      project={project}
      planId={latest?.id ?? null}
      initialPrompt={briefPrompt || undefined}
      initialPlan={latest?.plan ?? null}
      initialModel={latest?.model}
      autoStart={shouldAutoStart}
      awaitApproval={!latest && shouldAutoStart}
    />
  );
}
