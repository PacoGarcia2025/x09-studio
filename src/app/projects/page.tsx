import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { listProjects } from "@/lib/projects/actions";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Projetos</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Crie um projeto para começar a gerar sistemas com o Studio.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900"
        >
          Novo projeto
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-zinc-400">Nenhum projeto ainda.</p>
          <Link
            href="/projects/new"
            className="inline-block mt-4 text-sm text-zinc-200 underline-offset-4 hover:underline"
          >
            Criar o primeiro
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-900 rounded-xl border border-zinc-900">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-zinc-900/50"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {p.slug}.studio.x09.com.br · {p.status}
                  </p>
                </div>
                <span className="text-xs text-zinc-500">Abrir →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
