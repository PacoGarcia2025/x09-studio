"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generatePlanAction,
  type GeneratePlanResult,
} from "@/lib/pipeline/actions";
import type { StudioPlan } from "@/lib/pipeline/plan-schema";

type Props = {
  projectId: string;
  initialPrompt?: string;
  initialPlan?: StudioPlan | null;
  initialModel?: string | null;
};

export function PlannerPanel({
  projectId,
  initialPrompt = "",
  initialPlan = null,
  initialModel = null,
}: Props) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(
    initialPrompt || "Crie uma landing page para uma clínica.",
  );
  const [plan, setPlan] = useState<StudioPlan | null>(initialPlan);
  const [model, setModel] = useState<string | null>(initialModel);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result: GeneratePlanResult = await generatePlanAction(
        projectId,
        prompt,
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setPlan(result.plan);
      setModel(result.model);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="x09-card-soft rounded-3xl p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <label htmlFor="prompt" className="block text-sm font-medium text-zinc-200">
            Prompt
          </label>
          {model ? (
            <p className="text-xs text-zinc-500">Modelo: {model}</p>
          ) : null}
        </div>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          className="x09-input w-full resize-none rounded-3xl px-4 py-3 text-sm"
          placeholder="Crie um CRM para imobiliária."
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="x09-button rounded-2xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Gerando plano…" : "Gerar plano"}
          </button>
          <span className="text-xs text-zinc-600">
            O X09 organiza módulos, banco, APIs e tasks.
          </span>
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>

      {plan ? (
        <>
          <section className="x09-card-soft rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-violet-300">
              Resumo
            </p>
            <h3 className="mt-3 text-xl font-semibold text-white">
              {plan.project.name}
            </h3>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{plan.summary}</p>
            <p className="mt-3 text-xs text-zinc-500">
              {plan.project.description}
            </p>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <PlanList
              title="Módulos"
              items={plan.modules.map(
                (m) => `${m.name}: ${m.description}`,
              )}
            />
            <PlanList
              title="Páginas"
              items={plan.pages.map(
                (p) => `${p.path} — ${p.name}: ${p.description}`,
              )}
            />
            <PlanList
              title="Banco"
              items={plan.database.tables.map((t) => {
                const cols = t.columns?.length
                  ? ` (${t.columns.join(", ")})`
                  : "";
                return `${t.name}: ${t.description}${cols}`;
              })}
            />
            <PlanList
              title="APIs"
              items={plan.apis.map(
                (a) => `${a.method.toUpperCase()} ${a.path} — ${a.description}`,
              )}
            />
            <PlanList
              title="Autenticação"
              items={[
                `Providers: ${plan.auth.providers.join(", ")}`,
                `Roles: ${plan.auth.roles.join(", ")}`,
                plan.auth.notes ? `Notas: ${plan.auth.notes}` : null,
              ].filter(Boolean) as string[]}
            />
            <PlanList
              title="Integrações"
              items={
                plan.integrations.length
                  ? plan.integrations.map((i) => `${i.name}: ${i.purpose}`)
                  : ["Nenhuma integração adicional"]
              }
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-200">
              Tasks ({plan.tasks.length})
            </h2>
            <ol className="grid gap-3 text-sm text-zinc-300 lg:grid-cols-2">
              {plan.tasks.map((task) => (
                <li key={task.id} className="x09-card-soft rounded-3xl p-4">
                  <div className="font-medium text-zinc-100">
                    [{task.type}] {task.title}
                  </div>
                  <div className="text-zinc-400 mt-1">{task.instruction}</div>
                  {task.path ? (
                    <div className="text-xs text-zinc-500 mt-1">
                      path: {task.path}
                    </div>
                  ) : null}
                  {task.dependsOn?.length ? (
                    <div className="text-xs text-zinc-500 mt-1">
                      dependsOn: {task.dependsOn.join(", ")}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <details className="x09-card-soft rounded-3xl p-5">
            <summary className="cursor-pointer text-sm font-medium text-zinc-200">
              JSON do plano (avançado)
            </summary>
            <pre className="mt-4 max-h-[480px] overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
              {JSON.stringify(plan, null, 2)}
            </pre>
          </details>
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          Nenhum plano ainda. Envie um prompt para gerar.
        </p>
      )}
    </div>
  );
}

function PlanList({ title, items }: { title: string; items: string[] }) {
  return (
    <details className="x09-card-soft rounded-3xl p-5" open>
      <summary className="cursor-pointer text-sm font-medium text-zinc-200">
        {title}
      </summary>
      <ul className="mt-4 space-y-2 text-sm text-zinc-400">
        {items.map((item) => (
          <li key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            {item}
          </li>
        ))}
      </ul>
    </details>
  );
}
