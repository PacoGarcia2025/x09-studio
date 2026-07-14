import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
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

  return (
    <AppShell>
      <div className="space-y-6">
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

        <div className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-6 space-y-2">
          <p className="text-sm font-medium text-zinc-200">Próximo passo</p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            No Sprint 2 você poderá escrever um prompt e gerar o plano do
            sistema (Prompt → Planner). FileSystem e Builder vêm no Sprint 3+.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
