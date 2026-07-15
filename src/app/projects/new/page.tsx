import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { NewProjectForm } from "@/components/projects/NewProjectForm";

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  return (
    <AppShell>
      <div className="mb-8 space-y-4">
        <Link
          href="/projects"
          className="text-sm text-zinc-500 transition hover:text-violet-200"
        >
          ← Voltar
        </Link>
        <div className="x09-card rounded-[2rem] p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
            Novo sistema
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white">
            Configure o briefing inicial
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            Prepare nome, contexto e publicação. Apenas nome e subdomínio são
            enviados agora; domínio próprio fica preparado visualmente para o
            fluxo futuro.
          </p>
        </div>
      </div>
      <NewProjectForm />
    </AppShell>
  );
}
