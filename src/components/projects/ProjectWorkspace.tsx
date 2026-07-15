"use client";

import { useState } from "react";
import { BuilderPanel } from "@/components/builder/BuilderPanel";
import { FixPanel } from "@/components/fix/FixPanel";
import { PlannerPanel } from "@/components/planner/PlannerPanel";
import { ProjectFilesPanel } from "@/components/projects/ProjectFilesPanel";
import { VerifyPanel } from "@/components/verify/VerifyPanel";
import type { StudioPlan } from "@/lib/pipeline/plan-schema";

type TabId =
  | "overview"
  | "files"
  | "planner"
  | "builder"
  | "verify"
  | "fix"
  | "preview"
  | "deploy"
  | "logs";

type Props = {
  project: {
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
  };
  planId: string | null;
  initialPrompt?: string;
  initialPlan?: StudioPlan | null;
  initialModel?: string | null;
};

const tabs: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "overview", label: "Visão Geral", icon: "◈" },
  { id: "files", label: "Arquivos", icon: "⌘" },
  { id: "planner", label: "Planner", icon: "P" },
  { id: "builder", label: "Builder", icon: "B" },
  { id: "verify", label: "Verify", icon: "V" },
  { id: "fix", label: "Fix", icon: "F" },
  { id: "preview", label: "Preview", icon: "▣" },
  { id: "deploy", label: "Deploy", icon: "↑" },
  { id: "logs", label: "Logs", icon: "≡" },
];

export function ProjectWorkspace({
  project,
  planId,
  initialPrompt,
  initialPlan,
  initialModel,
}: Props) {
  const [active, setActive] = useState<TabId>("overview");
  const [verifyToken, setVerifyToken] = useState(0);
  const [fixToken, setFixToken] = useState(0);
  const [lastVerifyReportId, setLastVerifyReportId] = useState<string | null>(
    null,
  );

  return (
    <div className="space-y-6">
      <section className="x09-card overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm text-zinc-500">Projeto</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
              {project.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {project.slug}.studio.x09.com.br · status: {project.status}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <Metric label="Health" value="Aguardando" />
            <Metric label="Preview" value="Preparado" />
            <Metric label="Deploy" value="Pendente" />
          </div>
        </div>

        <div className="mt-7 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm transition ${
                active === tab.id
                  ? "bg-violet-500/20 text-violet-100 shadow-[0_0_24px_rgba(122,60,255,.18)]"
                  : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <span className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-[11px]">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="x09-fade-in">
        {active === "overview" ? (
          <Overview projectStatus={project.status} createdAt={project.created_at} />
        ) : null}
        {active === "files" ? <ProjectFilesPanel projectId={project.id} /> : null}
        {active === "planner" ? (
          <PanelFrame
            eyebrow="Planner"
            title="Transforme uma ideia em arquitetura"
            description="O plano aparece em cards expansíveis, módulos, banco, APIs e tasks."
          >
            <PlannerPanel
              projectId={project.id}
              initialPrompt={initialPrompt}
              initialPlan={initialPlan}
              initialModel={initialModel}
            />
          </PanelFrame>
        ) : null}
        {active === "builder" ? (
          <PanelFrame
            eyebrow="Builder"
            title="Pipeline visual de construção"
            description="Tasks, arquivos, comandos e SQL com estados animados."
          >
            <BuilderPanel
              planId={planId}
              projectId={project.id}
              onBuildSuccess={() => setVerifyToken((n) => n + 1)}
            />
          </PanelFrame>
        ) : null}
        {active === "verify" ? (
          <PanelFrame
            eyebrow="Verify"
            title="Qualidade estilo CI/CD"
            description="Build, lint, TypeScript, dependências, banco, env e estrutura."
          >
            <VerifyPanel
              planId={planId}
              projectId={project.id}
              autoStartToken={verifyToken}
              onVerifyComplete={(state) => {
                setLastVerifyReportId(state.reportId);
                setFixToken((n) => n + 1);
              }}
            />
          </PanelFrame>
        ) : null}
        {active === "fix" ? (
          <PanelFrame
            eyebrow="Auto Fix"
            title="Correção automática controlada"
            description="A UI comum mostra apenas progresso; detalhes ficam no avançado."
          >
            <FixPanel
              planId={planId}
              projectId={project.id}
              autoStartToken={fixToken}
              verifyReportId={lastVerifyReportId}
            />
          </PanelFrame>
        ) : null}
        {active === "preview" ? <FuturePanel kind="Preview" /> : null}
        {active === "deploy" ? <FuturePanel kind="Deploy" /> : null}
        {active === "logs" ? <LogsPanel /> : null}
      </section>
    </div>
  );
}

function Overview({
  projectStatus,
  createdAt,
}: {
  projectStatus: string;
  createdAt: string;
}) {
  const steps = ["Planner", "Builder", "Verify", "Auto Fix", "Preview", "Deploy"];
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="x09-card rounded-[2rem] p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-300">
          Timeline
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-6">
          {steps.map((step, index) => (
            <div key={step} className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">0{index + 1}</span>
                <span className="h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_16px_rgba(168,85,247,.9)]" />
              </div>
              <p className="mt-5 text-sm font-medium text-white">{step}</p>
              <p className="mt-1 text-xs text-zinc-500">status: standby</p>
              <p className="mt-1 text-xs text-zinc-600">tempo: --</p>
              <div className="mt-4 h-1.5 rounded-full bg-white/7">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                  style={{ width: `${projectStatus === "draft" ? 12 : 38}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="x09-card rounded-[2rem] p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-300">
          Health
        </p>
        <div className="mt-5 text-5xl font-semibold text-white">--</div>
        <p className="mt-2 text-sm text-zinc-500">Aguardando Verify Report.</p>
        <div className="mt-6 space-y-3 text-sm">
          <Metric label="Criado em" value={new Date(createdAt).toLocaleDateString("pt-BR")} />
          <Metric label="Preview" value="Disponível após Verify aprovado" />
          <Metric label="Deploy" value="Preparado para Sprint futura" />
        </div>
      </div>
    </div>
  );
}

function PanelFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="x09-card rounded-[2rem] p-6 md:p-8">
      <div className="mb-7 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-300">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function FuturePanel({ kind }: { kind: "Preview" | "Deploy" }) {
  return (
    <div className="x09-card rounded-[2rem] p-8">
      <p className="text-xs uppercase tracking-[0.25em] text-violet-300">
        {kind}
      </p>
      <div className="mt-5 grid min-h-[380px] gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#05030b] p-5">
          <p className="text-sm text-zinc-400">Editor / código</p>
          <div className="mt-5 space-y-2 font-mono text-xs text-zinc-600">
            <div>src/App.tsx</div>
            <div>components/...</div>
            <div>supabase/migrations/...</div>
          </div>
        </div>
        <div className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-5">
          <p className="text-sm text-zinc-300">
            {kind === "Preview"
              ? "Split view preparada para executar o sistema ao lado do código."
              : "Deploy visual preparado para publicação quando o Preview estiver aprovado."}
          </p>
          <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">
            Sprint futura
          </div>
        </div>
      </div>
    </div>
  );
}

function LogsPanel() {
  return (
    <details className="x09-card rounded-[2rem] p-6" open>
      <summary className="cursor-pointer text-sm font-medium text-white">
        Painel recolhível de logs
      </summary>
      <p className="mt-4 text-sm text-zinc-500">
        Logs detalhados permanecem dentro dos painéis técnicos (Builder,
        Verify, Fix) e não ocupam a tela principal.
      </p>
    </details>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] text-zinc-600">{label}</p>
      <p className="mt-1 text-sm text-zinc-300">{value}</p>
    </div>
  );
}
