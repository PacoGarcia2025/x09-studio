import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BuilderPanel } from "@/components/builder/BuilderPanel";
import { PlannerPanel } from "@/components/planner/PlannerPanel";
import { ProjectFilesPanel } from "@/components/projects/ProjectFilesPanel";
import { getLatestPlan } from "@/lib/pipeline/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
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
    <AppShell>
      <div className="space-y-10">
        <div className="space-y-2">
          <Link
            href="/projects"
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← Projetos
          </Link>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-zinc-400">
            {project.slug}.studio.x09.com.br · status: {project.status}
          </p>
        </div>

        <section>
          <ProjectFilesPanel projectId={project.id} />
        </section>

        <section className="space-y-3 border-t border-zinc-900 pt-8">
          <h2 className="text-lg font-medium">Planner</h2>
          <p className="text-sm text-zinc-500">
            Prompt → plano estruturado (JSON + tasks).
          </p>
          <PlannerPanel
            projectId={project.id}
            initialPrompt={latest?.prompt}
            initialPlan={latest?.plan ?? null}
            initialModel={latest?.model}
          />
        </section>

        <section className="space-y-3 border-t border-zinc-900 pt-8">
          <h2 className="text-lg font-medium">Builder</h2>
          <p className="text-sm text-zinc-500">
            Tasks → FileSystem. Depois de gerar o plano, execute o Builder.
            Atualize a árvore de arquivos para ver as mudanças.
          </p>
          <BuilderPanel planId={latest?.id ?? null} projectId={project.id} />
        </section>
      </div>
    </AppShell>
  );
}
