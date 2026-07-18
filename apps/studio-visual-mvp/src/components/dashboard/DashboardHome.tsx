import { Clock, ExternalLink, FolderOpen, Sparkles } from "lucide-react";
import { PromptComposer } from "@/components/dashboard/PromptComposer";
import type { ProjectSummary } from "@/store/project-store";
import type { BuildMode } from "@/store/studio-store";
import { cn } from "@/lib/utils";

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
      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-16 pt-16 md:pt-24">
        <div className="mb-8 animate-fade-up text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-indigo-200 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            X09 Agent · Build & Plan
          </p>
          <h1 className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-4xl font-bold tracking-tighter text-transparent md:text-5xl">
            O que vamos criar hoje?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
            Descreva o produto. O X09 planeja, gera multi-arquivo e entrega um
            preview pronto para publicar.
          </p>
          {isLoggedIn && creditBalance !== null && creditBalance !== undefined ? (
            <button
              type="button"
              onClick={onOpenBilling}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-200 backdrop-blur-md hover:bg-indigo-500/25"
            >
              Saldo: {creditBalance} créditos · ver planos
            </button>
          ) : null}
        </div>

        <div className="w-full animate-fade-up [animation-delay:80ms]">
          <PromptComposer
            large
            buildMode={buildMode}
            onBuildModeChange={onBuildModeChange}
            onSubmitPrompt={onSubmitPrompt}
            isGenerating={isGenerating}
            onStop={onStop}
          />
        </div>

        <div className="mt-14 w-full animate-fade-up [animation-delay:140ms]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Projetos recentes
            </h2>
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={onRequestLogin}
                className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
              >
                Entre para sincronizar
              </button>
            ) : null}
          </div>

          {isLoadingProjects ? (
            <p className="text-sm text-zinc-400">Carregando projetos…</p>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center backdrop-blur-md">
              <FolderOpen className="h-8 w-8 text-indigo-300/80" />
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
                    "hover:-translate-y-0.5 hover:border-indigo-400/35 hover:shadow-[0_0_24px_rgba(99,102,241,0.18)]",
                    "animate-fade-up",
                  )}
                  style={{ animationDelay: `${160 + index * 40}ms` }}
                >
                  <div className="relative h-28 overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-indigo-950">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.35),transparent_55%)]" />
                    <div className="absolute bottom-3 left-3 right-3 flex gap-1.5 opacity-80">
                      <span className="h-1.5 flex-1 rounded-full bg-white/20" />
                      <span className="h-1.5 w-8 rounded-full bg-indigo-400/60" />
                    </div>
                  </div>
                  <div className="space-y-1.5 p-4">
                    <p className="truncate text-sm font-semibold text-white group-hover:text-indigo-100">
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
                        className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"
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
