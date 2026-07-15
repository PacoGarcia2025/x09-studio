"use client";

import { useState } from "react";
import { BuilderPanel } from "@/components/builder/BuilderPanel";
import { X09Robot } from "@/components/brand/X09Robot";
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
  const [developerMode, setDeveloperMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [publishPanelOpen, setPublishPanelOpen] = useState(false);

  const assistantMessages = [
    "Estou entendendo seu projeto...",
    "Criando a experiência visual...",
    "Preparando páginas e componentes...",
    "Organizando autenticação e dados...",
    "Publicando preview em tempo real...",
  ];

  const previewWidth =
    previewDevice === "desktop"
      ? "w-full"
      : previewDevice === "tablet"
        ? "max-w-[760px]"
        : "max-w-[390px]";

  return (
    <div className="space-y-5">
      <section className="x09-card rounded-[2rem] p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-violet-200">
                {project.status}
              </span>
              <span>IA: {initialModel ?? "X09 Router"}</span>
              <span>Preview automático</span>
            </div>
            <h1 className="mt-3 truncate text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
              {project.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Converse com o X09. A parte técnica fica escondida até você ativar
              o modo desenvolvedor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="x09-muted-button rounded-2xl px-4 py-2 text-sm text-zinc-300"
            >
              Histórico
            </button>
            <button
              type="button"
              className="x09-muted-button rounded-2xl px-4 py-2 text-sm text-zinc-300"
            >
              Configurações
            </button>
            <button
              type="button"
              onClick={() => setDeveloperMode((value) => !value)}
              className={`rounded-2xl px-4 py-2 text-sm transition ${
                developerMode
                  ? "border border-orange-300/35 bg-orange-400/12 text-orange-100"
                  : "x09-muted-button text-zinc-300"
              }`}
            >
              Modo Desenvolvedor
            </button>
            <button
              type="button"
              onClick={() => setPublishPanelOpen((value) => !value)}
              className="x09-button rounded-2xl px-5 py-2.5 text-sm font-semibold text-white"
            >
              Publicar
            </button>
          </div>
        </div>

        {publishPanelOpen ? <PublishPanel slug={project.slug} /> : null}
      </section>

      <section className="grid min-h-[720px] gap-5 xl:grid-cols-[minmax(360px,0.46fr)_minmax(520px,0.54fr)]">
        <div className="x09-card flex min-h-[720px] flex-col overflow-hidden rounded-[2rem]">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden">
                <X09Robot compact />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-violet-300">
                  Robô X09
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  Seu desenvolvedor inteligente
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Você descreve. O X09 planeja, cria, verifica e prepara a
                  publicação.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <ChatBubble
              author="Você"
              tone="user"
              text={
                initialPrompt ??
                "Crie um site premium para um escritório de advocacia"
              }
            />
            {assistantMessages.map((message, index) => (
              <ChatBubble
                key={message}
                author="X09"
                tone="assistant"
                text={message}
                active={index === 1}
              />
            ))}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <AttachmentButton label="Arquivo" />
              <AttachmentButton label="Imagem" />
              <AttachmentButton label="Áudio em breve" muted />
            </div>
            <div className="flex gap-3">
              <textarea
                className="x09-input min-h-14 flex-1 resize-none rounded-2xl px-4 py-3 text-sm"
                placeholder="Descreva o que deseja criar ou alterar..."
                rows={2}
              />
              <button
                type="button"
                className="x09-button self-end rounded-2xl px-5 py-3 text-sm font-semibold text-white"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>

        <div className="x09-card flex min-h-[720px] flex-col overflow-hidden rounded-[2rem]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-violet-300">
                Preview em tempo real
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Atualizado automaticamente após cada alteração do chat.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["desktop", "tablet", "mobile"] as const).map((device) => (
                <button
                  key={device}
                  type="button"
                  onClick={() => setPreviewDevice(device)}
                  className={`rounded-xl px-3 py-2 text-xs capitalize transition ${
                    previewDevice === device
                      ? "bg-violet-500/20 text-violet-100"
                      : "x09-muted-button text-zinc-400"
                  }`}
                >
                  {device}
                </button>
              ))}
              <button type="button" className="x09-muted-button rounded-xl px-3 py-2 text-xs text-zinc-400">
                Tela cheia
              </button>
              <button type="button" className="x09-muted-button rounded-xl px-3 py-2 text-xs text-zinc-400">
                Nova aba
              </button>
              <button type="button" className="x09-muted-button rounded-xl px-3 py-2 text-xs text-zinc-400">
                Atualizar
              </button>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center bg-[#030108] p-5">
            <div
              className={`h-full min-h-[560px] ${previewWidth} overflow-hidden rounded-[1.5rem] border border-white/10 bg-white text-zinc-950 shadow-2xl transition-all`}
            >
              <PreviewMock projectName={project.name} />
            </div>
          </div>
        </div>
      </section>

      {developerMode ? (
        <DeveloperConsole
          active={active}
          setActive={setActive}
          project={project}
          planId={planId}
          initialPrompt={initialPrompt}
          initialPlan={initialPlan}
          initialModel={initialModel}
          verifyToken={verifyToken}
          setVerifyToken={setVerifyToken}
          fixToken={fixToken}
          setFixToken={setFixToken}
          lastVerifyReportId={lastVerifyReportId}
          setLastVerifyReportId={setLastVerifyReportId}
        />
      ) : null}
    </div>
  );
}

function ChatBubble({
  author,
  text,
  tone,
  active,
}: {
  author: string;
  text: string;
  tone: "user" | "assistant";
  active?: boolean;
}) {
  return (
    <div className={`flex ${tone === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[86%] rounded-3xl border p-4 ${
          tone === "user"
            ? "border-violet-400/25 bg-violet-500/15 text-violet-50"
            : "border-white/10 bg-white/[0.04] text-zinc-200"
        }`}
      >
        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
          <span>{author}</span>
          {active ? (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,245,164,.8)]" />
          ) : null}
        </div>
        <p className="text-sm leading-6">{text}</p>
      </div>
    </div>
  );
}

function AttachmentButton({
  label,
  muted,
}: {
  label: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        muted
          ? "border-white/8 bg-white/[0.02] text-zinc-600"
          : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-violet-400/40 hover:text-violet-100"
      }`}
    >
      {label}
    </button>
  );
}

function PublishPanel({ slug }: { slug: string }) {
  return (
    <div className="mt-5 rounded-3xl border border-violet-400/20 bg-violet-500/10 p-5">
      <p className="text-sm font-medium text-white">Onde deseja publicar?</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="font-medium text-violet-100">Subdomínio X09</p>
          <p className="mt-2 text-sm text-zinc-500">
            {slug}.studio.x09.com.br
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="font-medium text-violet-100">Domínio próprio</p>
          <p className="mt-2 text-sm text-zinc-500">
            Assistente preparado: domínio, Cloudflare, DNS, SSL e publicar.
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewMock({ projectName }: { projectName: string }) {
  return (
    <div className="min-h-full bg-[#faf7ff]">
      <div className="border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{projectName}</div>
          <div className="hidden gap-5 text-sm text-zinc-500 md:flex">
            <span>Início</span>
            <span>Serviços</span>
            <span>Equipe</span>
            <span>Contato</span>
          </div>
        </div>
      </div>
      <div className="px-6 py-12 md:px-10 md:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
            Preview gerado pelo X09
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 md:text-6xl">
            Uma presença digital premium em construção.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600">
            O preview será conectado ao runtime real nas próximas etapas. A
            experiência já está preparada para atualizar automaticamente a cada
            mensagem do chat.
          </p>
          <button className="mt-8 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-600/25">
            Solicitar proposta
          </button>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {["Design premium", "SEO preparado", "Publicação simples"].map((item) => (
            <div key={item} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="h-2 w-12 rounded-full bg-violet-500" />
              <p className="mt-5 font-medium text-zinc-950">{item}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Estrutura visual pronta para evoluir com conteúdo real.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeveloperConsole({
  active,
  setActive,
  project,
  planId,
  initialPrompt,
  initialPlan,
  initialModel,
  verifyToken,
  setVerifyToken,
  fixToken,
  setFixToken,
  lastVerifyReportId,
  setLastVerifyReportId,
}: Props & {
  active: TabId;
  setActive: (tab: TabId) => void;
  verifyToken: number;
  setVerifyToken: React.Dispatch<React.SetStateAction<number>>;
  fixToken: number;
  setFixToken: React.Dispatch<React.SetStateAction<number>>;
  lastVerifyReportId: string | null;
  setLastVerifyReportId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  return (
    <section className="x09-fade-in x09-card rounded-[2rem] p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-orange-200">
            Modo Desenvolvedor
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Painéis técnicos do pipeline
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Visível apenas para operação avançada. Usuários finais continuam no
            chat e preview.
          </p>
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm transition ${
                active === tab.id
                  ? "bg-orange-400/15 text-orange-100"
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
      </div>

      <div className="mt-6">
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
      </div>
    </section>
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
