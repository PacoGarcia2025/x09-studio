"use client";

import { useState, useTransition } from "react";
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
  const [prompt, setPrompt] = useState(
    initialPrompt || "Crie um CRM para imobiliária.",
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
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="space-y-3">
        <label htmlFor="prompt" className="block text-sm text-zinc-400">
          Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
          placeholder="Crie um CRM para imobiliária."
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-60"
        >
          {pending ? "Gerando plano…" : "Gerar plano"}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {model ? (
          <p className="text-xs text-zinc-500">Modelo: {model}</p>
        ) : null}
      </form>

      {plan ? (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-zinc-200">Resumo</h2>
            <p className="text-sm text-zinc-400">{plan.summary}</p>
            <p className="text-xs text-zinc-500">
              Projeto planejado: {plan.project.name} — {plan.project.description}
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
            <ol className="space-y-2 list-decimal list-inside text-sm text-zinc-300">
              {plan.tasks.map((task) => (
                <li key={task.id} className="rounded-lg border border-zinc-900 p-3">
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

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-zinc-200">JSON do plano</h2>
            <pre className="overflow-auto rounded-lg border border-zinc-900 bg-zinc-950 p-4 text-xs text-zinc-300 max-h-[480px]">
              {JSON.stringify(plan, null, 2)}
            </pre>
          </section>
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
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-zinc-200">{title}</h2>
      <ul className="space-y-1 text-sm text-zinc-400 list-disc list-inside">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
