import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { listProjects } from "@/lib/projects/actions";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();
  const pipeline = ["Planner", "Builder", "Verify", "Auto Fix", "Preview", "Deploy"];

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="x09-card overflow-hidden rounded-[2rem] p-8">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
                Dashboard
              </p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                Laboratório de IA
              </h1>
              <p className="text-sm leading-7 text-zinc-400">
                Crie, acompanhe e publique sistemas com agentes trabalhando em
                Planner, Builder, Verify e Auto Fix.
              </p>
            </div>
            <Link
              href="/projects/new"
              className="x09-button rounded-2xl px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Criar Projeto
            </Link>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-6">
            {pipeline.map((step, index) => (
              <div key={step} className="x09-card-soft rounded-3xl p-4">
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-500/15 text-sm text-violet-200">
                    {index + 1}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_16px_rgba(168,85,247,.9)]" />
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-100">{step}</p>
                <p className="mt-1 text-xs text-zinc-500">standby · 0ms</p>
                <div className="mt-3 h-1.5 rounded-full bg-white/7">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                    style={{ width: `${Math.max(14, 78 - index * 9)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Projetos</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Cards modernos com status, preview e deploy preparados.
            </p>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="x09-card rounded-[2rem] border-dashed p-12 text-center">
            <p className="text-zinc-400">Nenhum projeto ainda.</p>
            <Link
              href="/projects/new"
              className="x09-button mt-5 inline-block rounded-2xl px-5 py-3 text-sm font-semibold text-white"
            >
              Criar o primeiro
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="x09-card group rounded-[1.75rem] p-5 transition hover:-translate-y-1 hover:border-violet-400/35"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-white">{p.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {p.slug}.studio.x09.com.br
                    </p>
                  </div>
                  <StatusPill status={p.status} />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                  <Metric label="Health Score" value="Aguardando" />
                  <Metric label="Preview" value="Preparado" />
                  <Metric
                    label="Deploy"
                    value={p.status === "published" ? "Ativo" : "Pendente"}
                  />
                  <Metric label="Arquivos" value="Template" />
                  <Metric label="Modelo" value="Gemini 2.5" />
                  <Metric
                    label="Última alteração"
                    value={new Date(p.updated_at).toLocaleDateString("pt-BR")}
                  />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <p className="text-xs text-zinc-500">
                    Última execução: pipeline standby
                  </p>
                  <span className="text-xs text-violet-200 transition group-hover:translate-x-1">
                    Abrir →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[11px] text-zinc-600">{label}</p>
      <p className="mt-1 truncate text-zinc-300">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "ready" || status === "published"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : status === "error"
        ? "border-red-400/25 bg-red-400/10 text-red-200"
        : status === "generating"
          ? "border-violet-400/25 bg-violet-400/10 text-violet-200"
          : "border-white/10 bg-white/5 text-zinc-300";
  return (
    <span className={`rounded-full border px-3 py-1 text-xs ${color}`}>
      {status}
    </span>
  );
}
