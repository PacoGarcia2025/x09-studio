import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Clock,
  ExternalLink,
  FolderOpen,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { PromptComposer } from "@/components/dashboard/PromptComposer";
import type { ProjectSummary } from "@/store/project-store";
import type { BuildMode } from "@/store/studio-store";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    title: "Landing premium",
    description: "Página de alta conversão para serviços",
    prompt:
      "Crie uma landing page premium para uma empresa de serviços, com hero forte, benefícios, prova social, FAQ e CTA.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Loja virtual",
    description: "Catálogo elegante com carrinho visual",
    prompt:
      "Crie uma loja virtual premium com catálogo, filtros, detalhes do produto, carrinho e checkout visual.",
    icon: ShoppingBag,
  },
  {
    title: "Sistema de reservas",
    description: "Agenda, serviços e confirmação",
    prompt:
      "Crie um sistema de reservas com calendário, escolha de serviço, profissional, horário e confirmação.",
    icon: CalendarDays,
  },
  {
    title: "Dashboard SaaS",
    description: "Métricas, gráficos e atividades",
    prompt:
      "Crie um dashboard SaaS moderno com métricas, gráficos, tabela de atividades e navegação lateral.",
    icon: BarChart3,
  },
] as const;

export function DashboardHome({
  buildMode,
  onBuildModeChange,
  onSubmitPrompt,
  isGenerating,
  onStop,
  projects,
  isLoadingProjects,
  onOpenProject,
  isLoggedIn,
  onRequestLogin,
  creditBalance,
  onOpenBilling,
}: {
  buildMode: BuildMode;
  onBuildModeChange: (mode: BuildMode) => void;
  onSubmitPrompt: (prompt: string) => Promise<void> | void;
  isGenerating?: boolean;
  onStop?: () => void;
  projects: ProjectSummary[];
  isLoadingProjects: boolean;
  onOpenProject: (id: string) => void;
  isLoggedIn: boolean;
  onRequestLogin: () => void;
  creditBalance?: number | null;
  onOpenBilling?: () => void;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-20 pt-14 md:pt-20">
        <div className="mb-9 max-w-3xl animate-fade-up text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
            AI app builder · do prompt ao deploy
          </p>
          <h1 className="text-4xl font-bold tracking-[-0.045em] text-[#F8FAFC] md:text-6xl">
            Transforme sua ideia em um{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
              app real
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
            Descreva o que você quer construir. O X09 planeja, programa,
            verifica e publica — enquanto você acompanha tudo em tempo real.
          </p>
          {isLoggedIn && creditBalance !== null && creditBalance !== undefined ? (
            <button
              type="button"
              onClick={onOpenBilling}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200 backdrop-blur-md hover:bg-violet-500/20"
            >
              Saldo: {creditBalance} créditos · ver planos
            </button>
          ) : null}
        </div>

        <div className="w-full max-w-3xl animate-fade-up [animation-delay:80ms]">
          <PromptComposer
            large
            buildMode={buildMode}
            onBuildModeChange={onBuildModeChange}
            onSubmitPrompt={onSubmitPrompt}
            isGenerating={isGenerating}
            onStop={onStop}
          />
        </div>

        <div className="mt-12 w-full animate-fade-up [animation-delay:120ms]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                Comece com um template
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Estruturas prontas que o X09 personaliza para sua marca
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.title}
                  type="button"
                  onClick={() => void onSubmitPrompt(template.prompt)}
                  disabled={isGenerating}
                  className="group rounded-2xl border border-[#27272A] bg-[#1A1A1F]/70 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-violet-500/40 hover:bg-violet-500/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600/15 text-violet-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-100">
                    {template.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {template.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-14 w-full animate-fade-up [animation-delay:160ms]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Projetos recentes
            </h2>
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={onRequestLogin}
                className="text-xs font-medium text-violet-300 hover:text-violet-200"
              >
                Entre para sincronizar
              </button>
            ) : null}
          </div>

          {isLoadingProjects ? (
            <p className="text-sm text-zinc-400">Carregando projetos…</p>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center backdrop-blur-md">
              <FolderOpen className="h-8 w-8 text-violet-300/80" />
              <p className="text-sm font-medium text-white">
                Nenhum projeto ainda
              </p>
              <p className="max-w-sm text-sm text-zinc-400">
                Seu primeiro app aparece aqui após a geração. Comece pelo campo
                acima.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.slice(0, 6).map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onOpenProject(project.id)}
                  className={cn(
                    "group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] text-left backdrop-blur-md transition",
                    "hover:-translate-y-0.5 hover:border-violet-400/35 hover:shadow-[0_0_24px_rgba(124,58,237,0.18)]",
                    "animate-fade-up",
                  )}
                  style={{ animationDelay: `${160 + index * 40}ms` }}
                >
                  <div className="relative h-28 overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-violet-950">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.35),transparent_55%)]" />
                    <div className="absolute bottom-3 left-3 right-3 flex gap-1.5 opacity-80">
                      <span className="h-1.5 flex-1 rounded-full bg-white/20" />
                      <span className="h-1.5 w-8 rounded-full bg-violet-400/60" />
                    </div>
                  </div>
                  <div className="space-y-1.5 p-4">
                    <p className="truncate text-sm font-semibold text-white group-hover:text-violet-100">
                      {project.name}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock className="h-3 w-3" />
                      {new Date(project.updated_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {project.published_url ? (
                      <a
                        href={project.published_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
                      >
                        <ExternalLink className="h-3 w-3" />
                        URL pública
                      </a>
                    ) : project.publish_status ? (
                      <p className="text-xs text-zinc-400">
                        Deploy: {project.publish_status}
                      </p>
                    ) : null}
                    {project.github_repo_full_name ? (
                      <p className="truncate text-[11px] text-zinc-500">
                        {project.github_repo_full_name}
                      </p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
