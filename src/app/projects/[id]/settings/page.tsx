import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditBalanceNav } from "@/components/billing/CreditBalanceNav";
import { StudioAtmosphere } from "@/components/brand/StudioAtmosphere";
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
    <div className="x09-landing relative min-h-dvh overflow-x-hidden text-zinc-100">
      <StudioAtmosphere />
      <header className="relative z-10 flex h-12 items-center gap-3 border-b border-white/8 bg-black/30 px-4 backdrop-blur-xl">
        <Link
          href={`/projects/${id}`}
          className="text-sm text-zinc-500 transition hover:text-violet-200"
        >
          ← Voltar ao projeto
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          Configurações — {settings.name}
        </h1>
        <CreditBalanceNav compact />
      </header>
      <main className="relative z-10 px-4 py-8">
        <div className="x09-card mx-auto max-w-3xl rounded-[2rem] p-6">
          <ProjectSettingsForm
            projectId={id}
            initialBrief={settings.briefPrompt}
            initialFacts={settings.companyFacts}
          />
        </div>
      </main>
    </div>
  );
}
