import { notFound } from "next/navigation";
import { ProjectWorkspace } from "@/components/projects/ProjectWorkspace";
import { getLatestPlan } from "@/lib/pipeline/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autostart?: string }>;
};

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { autostart } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, slug, status, created_at, workspace_id")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", project.workspace_id)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) notFound();

  const latest = await getLatestPlan(project.id);

  return (
    <ProjectWorkspace
      project={project}
      planId={latest?.id ?? null}
      initialPrompt={latest?.prompt}
      initialPlan={latest?.plan ?? null}
      initialModel={latest?.model}
      autoStart={autostart === "1"}
    />
  );
}
