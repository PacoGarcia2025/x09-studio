import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { listProjects } from "@/lib/projects/actions";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();
  const suggestions = [
    "Site premium para escritório de advocacia",
    "CRM para imobiliária com portal público",
    "Landing page para consultoria B2B",
    "Sistema de reservas com pagamento",
    "Dashboard financeiro para empresa",
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(69,200,255,.28),transparent_26%),radial-gradient(circle_at_50%_44%,rgba(255,65,180,.35),transparent_34%),linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.025))] px-5 py-14 shadow-[0_30px_100px_rgba(0,0,0,.35)] md:px-10 md:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_110%,rgba(122,60,255,.45),transparent_42%)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <Link
              href="/ecosystem"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/75 px-4 py-2 text-xs font-medium text-zinc-800 shadow-xl shadow-violet-950/10 backdrop-blur"
            >
              Conecte IA, GitHub, Supabase e domínio próprio →
            </Link>
            <h1 className="mt-8 text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
              O que você quer construir hoje?
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-violet-50/75">
              Descreva um site, sistema ou automação. O X09 conversa com você,
              constrói, mostra o preview e prepara a publicação.
            </p>

            <div className="mx-auto mt-8 max-w-3xl rounded-[2rem] border border-white/20 bg-white p-3 text-left shadow-2xl shadow-violet-950/20">
              <textarea
                className="min-h-24 w-full resize-none rounded-3xl bg-transparent px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                placeholder="Ex: Crie um site premium para um escritório de advocacia..."
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-2 pt-3">
                <div className="flex items-center gap-2">
                  <button className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200 text-zinc-500">
                    +
                  </button>
                  <button className="rounded-full border border-zinc-200 px-3 py-2 text-xs text-zinc-600">
                    Upload
                  </button>
                  <button className="rounded-full border border-zinc-200 px-3 py-2 text-xs text-zinc-600">
                    Imagem
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
                    X09 decide a IA
                  </span>
                  <Link
                    href="/projects/new"
                    className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 text-white transition hover:scale-105"
                  >
                    ↑
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <Link
                  key={suggestion}
                  href="/projects/new"
                  className="rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs text-white/80 backdrop-blur transition hover:bg-white/18 hover:text-white"
                >
                  {suggestion}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="x09-card rounded-[2rem] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {["Search", "Meus apps", "Recentes", "Templates X09"].map((filter) => (
                <button
                  key={filter}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-zinc-400 transition hover:bg-white/8 hover:text-white"
                >
                  {filter}
                </button>
              ))}
            </div>
            <Link href="/ecosystem" className="text-sm text-violet-200">
              Configurar conectores →
            </Link>
          </div>
        </section>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Seus apps</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Tudo que você construiu com o X09, pronto para continuar pelo chat.
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
                  <Metric label="IA" value="X09 Router" />
                  <Metric
                    label="Última alteração"
                    value={new Date(p.updated_at).toLocaleDateString("pt-BR")}
                  />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <p className="text-xs text-zinc-500">
                    Continuar conversa com X09
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
