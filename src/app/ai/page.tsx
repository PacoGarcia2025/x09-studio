import { AppShell } from "@/components/AppShell";
import { aiProviderCatalog, platformApiCatalog } from "@/lib/llm/catalog";

export const dynamic = "force-dynamic";

export default function AiModelsPage() {
  const active = aiProviderCatalog.filter((provider) => provider.status === "active");
  const configurable = aiProviderCatalog.filter(
    (provider) => provider.status === "ready-to-configure",
  );

  return (
    <AppShell activeHref="/ai">
      <div className="space-y-8 px-5 py-8 md:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-violet-600">
                Recursos
              </p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-zinc-900 md:text-5xl">
                O cérebro multi-IA do X09 Studio
              </h1>
              <p className="text-sm leading-7 text-zinc-500">
                Base para operar modelos pagos e gratuitos no Planner, Builder,
                Verify e Auto Fix, com fallback, custo por tarefa e qualidade por
                tipo de produto.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Ativo agora" value={`${active.length} provider`} />
              <Metric label="Prontos para configurar" value={`${configurable.length}`} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {aiProviderCatalog.map((provider) => (
            <article key={provider.id} className="x09-card rounded-[1.75rem] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-white">{provider.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {provider.recommendedFor}
                  </p>
                </div>
                <StatusPill status={provider.status} tier={provider.tier} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {provider.strengths.map((strength) => (
                  <span
                    key={strength}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400"
                  >
                    {strength}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoBlock label="Env vars" value={provider.envVars.join(", ")} />
                <InfoBlock label="Modelos" value={provider.models.join(", ")} />
              </div>
            </article>
          ))}
        </section>

        <section className="x09-card rounded-[2rem] p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.24em] text-violet-300">
              APIs de plataforma
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Configurações necessárias para competir com Lovable
            </h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {platformApiCatalog.map((api) => (
              <div
                key={api.name}
                className="rounded-3xl border border-white/8 bg-white/[0.03] p-4"
              >
                <p className="font-medium text-white">{api.name}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{api.purpose}</p>
                <p className="mt-3 text-xs text-violet-200">
                  {api.envVars.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">
        {label}
      </p>
      <p className="mt-2 text-xs leading-5 text-zinc-300">{value}</p>
    </div>
  );
}

function StatusPill({
  status,
  tier,
}: {
  status: string;
  tier: string;
}) {
  const statusLabel =
    status === "active"
      ? "ativo"
      : status === "ready-to-configure"
        ? "configurar"
        : "planejado";

  const color =
    status === "active"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : status === "ready-to-configure"
        ? "border-violet-400/25 bg-violet-400/10 text-violet-200"
        : "border-white/10 bg-white/5 text-zinc-300";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs ${color}`}>
      {statusLabel} · {tier}
    </span>
  );
}
