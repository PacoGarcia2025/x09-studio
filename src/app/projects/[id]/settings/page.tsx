import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectSettingsForm } from "@/components/projects/ProjectSettingsForm";
import { getProjectSettingsAction } from "@/lib/projects/settings.actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectSettingsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const settings = await getProjectSettingsAction(id);
  if (!settings.ok) notFound();

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      <header className="flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-4">
        <Link
          href={`/projects/${id}`}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← Voltar ao projeto
        </Link>
        <h1 className="text-sm font-semibold text-zinc-900">
          Configurações — {settings.name}
        </h1>
      </header>
      <main className="px-4 py-8">
        <ProjectSettingsForm
          projectId={id}
          initialBrief={settings.briefPrompt}
          initialFacts={settings.companyFacts}
        />
      </main>
    </div>
  );
}
