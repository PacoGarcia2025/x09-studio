import { AppShell } from "@/components/AppShell";
import {
  aiRouterAssignments,
  ecosystemConnectors,
  publishingSteps,
  type EcosystemConnector,
} from "@/lib/ecosystem/catalog";

export const dynamic = "force-dynamic";

const categories = Array.from(
  new Set(ecosystemConnectors.map((connector) => connector.category)),
);

export default function EcosystemPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <section className="x09-card overflow-hidden rounded-[2rem] p-8">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
                Ecossistema
              </p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                Conecte IA, dados, domínio e publicação em um só lugar.
              </h1>
              <p className="text-sm leading-7 text-zinc-400">
                Estrutura inspirada em Lovable e Base44: o usuário conversa com
                o X09, enquanto conectores, chaves, deploy e automações ficam em
                uma central simples.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Conectados" value="2" />
              <Metric label="Disponíveis" value="8" />
              <Metric label="Planejados" value="2" />
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            {categories.map((category) => (
              <div key={category} className="x09-card rounded-[2rem] p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-violet-300">
                      {category}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Conectores com ações preparadas para automação.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {ecosystemConnectors
                    .filter((connector) => connector.category === category)
                    .map((connector) => (
                      <ConnectorCard key={connector.id} connector={connector} />
                    ))}
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-5">
            <section className="x09-card rounded-[2rem] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-violet-300">
                AI Router
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                O usuário nunca escolhe modelo.
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                O Studio decide automaticamente a IA por tipo de tarefa e usa
                fallback quando necessário.
              </p>
              <div className="mt-5 space-y-3">
                {aiRouterAssignments.map((assignment) => (
                  <div
                    key={assignment.task}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">
                        {assignment.task}
                      </p>
                      <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs text-violet-100">
                        {assignment.provider}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {assignment.reason}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="x09-card rounded-[2rem] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-violet-300">
                Publicação
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Domínio próprio sem complexidade.
              </h2>
              <div className="mt-5 space-y-3">
                {publishingSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-violet-400/25 bg-violet-500/10 text-xs text-violet-100">
                      {index + 1}
                    </span>
                    <span className="text-sm text-zinc-300">{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-dashed border-white/12 p-4">
                <p className="text-sm text-zinc-400">Fluxo do usuário:</p>
                <p className="mt-2 text-sm text-white">
                  Subdomínio X09 ou domínio próprio com assistente guiado:
                  domínio, Cloudflare, DNS, SSL e publicar.
                </p>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function ConnectorCard({ connector }: { connector: EcosystemConnector }) {
  return (
    <article className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-white">{connector.name}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {connector.description}
          </p>
        </div>
        <StatusPill status={connector.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {connector.automation.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-zinc-400"
          >
            {item}
          </span>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-violet-200">
        {connector.envVars.join(" · ")}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["Conectar", "Testar", "Editar", "Remover"].map((action) => (
          <button
            key={action}
            type="button"
            className="x09-muted-button rounded-xl px-2.5 py-2 text-xs text-zinc-300"
          >
            {action}
          </button>
        ))}
      </div>
    </article>
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

function StatusPill({ status }: { status: string }) {
  const label =
    status === "connected"
      ? "conectado"
      : status === "available"
        ? "configurar"
        : "planejado";

  const color =
    status === "connected"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : status === "available"
        ? "border-violet-400/25 bg-violet-400/10 text-violet-200"
        : "border-white/10 bg-white/5 text-zinc-300";

  return <span className={`rounded-full border px-3 py-1 text-xs ${color}`}>{label}</span>;
}
