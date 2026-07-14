import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { NewProjectForm } from "@/components/projects/NewProjectForm";

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  return (
    <AppShell>
      <div className="mb-8 space-y-2">
        <Link
          href="/projects"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← Voltar
        </Link>
        <h1 className="text-2xl font-semibold">Novo projeto</h1>
        <p className="text-sm text-zinc-400">
          Defina nome e slug. O prompt e o pipeline entram no Sprint 2.
        </p>
      </div>
      <NewProjectForm />
    </AppShell>
  );
}
