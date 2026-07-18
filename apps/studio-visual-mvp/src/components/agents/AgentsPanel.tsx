import {
  Bot,
  Braces,
  CheckCircle2,
  Hammer,
  Route,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useStudioStore } from "@/store/studio-store";
import { cn } from "@/lib/utils";

const AGENTS = [
  {
    id: "router",
    name: "AI Router",
    description: "Entende o pedido e escolhe o melhor modelo e fluxo.",
    icon: Route,
  },
  {
    id: "planner",
    name: "Planner",
    description: "Transforma a ideia em arquitetura, páginas e tarefas.",
    icon: Braces,
  },
  {
    id: "builder",
    name: "Builder",
    description: "Gera e edita todos os arquivos do aplicativo.",
    icon: Hammer,
  },
  {
    id: "verifier",
    name: "Verifier",
    description: "Valida estrutura, consistência e qualidade da entrega.",
    icon: ShieldCheck,
  },
  {
    id: "fixer",
    name: "Fixer",
    description: "Detecta erros do preview e aplica correções automáticas.",
    icon: WandSparkles,
  },
] as const;

export function AgentsPanel() {
  const phase = useStudioStore((state) => state.agentPhase);
  const phaseLabel = useStudioStore((state) => state.agentPhaseLabel);
  const isGenerating = useStudioStore((state) => state.isGenerating);
  const metrics = useStudioStore((state) => state.metrics);
  const lastResolvedMode = useStudioStore((state) => state.lastResolvedMode);
  const fileCount = useStudioStore((state) => Object.keys(state.files).length);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-6 border-b border-[#27272A] pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
              Orquestração multi-agent
            </p>
            <h1 className="text-3xl font-bold tracking-[-0.035em] text-[#F8FAFC]">
              Sua equipe de IA
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Agentes especializados trabalham em sequência para transformar
              uma ideia em código funcional, verificado e pronto para publicar.
            </p>
          </div>
          <div className="rounded-2xl border border-[#27272A] bg-[#1A1A1F] px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Estado atual
            </p>
            <p
              className={cn(
                "mt-1 text-sm font-semibold",
                isGenerating ? "text-violet-300" : "text-emerald-400",
              )}
            >
              {isGenerating ? phaseLabel || "Trabalhando…" : "Pronto para criar"}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {AGENTS.map((agent, index) => {
            const Icon = agent.icon;
            const active =
              isGenerating &&
              ((agent.id === "planner" && phase === "planejando") ||
                (agent.id === "builder" && phase === "construindo") ||
                (agent.id === "verifier" && phase === "verificando") ||
                (agent.id === "fixer" && phase === "corrigindo") ||
                (agent.id === "router" && !phase));

            return (
              <article
                key={agent.id}
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-[#1A1A1F]/80 p-5 transition",
                  active
                    ? "border-violet-500/50 ring-1 ring-violet-500/20"
                    : "border-[#27272A]",
                )}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-xl",
                      active
                        ? "bg-violet-600 text-white"
                        : "bg-violet-600/15 text-violet-300",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-slate-600">
                    0{index + 1}
                  </span>
                </div>
                <h2 className="mt-5 text-base font-semibold text-slate-100">
                  {agent.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {agent.description}
                </p>
                <div className="mt-5 flex items-center gap-2 text-xs">
                  {active ? (
                    <>
                      <Bot className="h-3.5 w-3.5 animate-pulse text-violet-300" />
                      <span className="text-violet-300">Em execução</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-slate-500">Disponível</span>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {metrics ? (
          <div className="mt-8 grid gap-3 rounded-2xl border border-[#27272A] bg-[#111113]/80 p-5 sm:grid-cols-3">
            <Metric
              label="Arquivos gerados"
              value={String(fileCount)}
            />
            <Metric
              label="Ciclos de reparo"
              value={String(metrics.repairCycles ?? 0)}
            />
            <Metric
              label="Modo"
              value={lastResolvedMode || "auto"}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.025] px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
    </div>
  );
}
