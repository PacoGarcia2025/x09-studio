import {
  Clock,
  ExternalLink,
  FolderOpen,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PromptComposer } from "@/components/dashboard/PromptComposer";
import type { ProjectSummary } from "@/store/project-store";
import type { BuildMode } from "@/store/studio-store";
import { cn } from "@/lib/utils";

type ProjectTab = "mine" | "recent" | "templates";

const TEMPLATES = [
  {
    title: "Landing premium",
    description: "Site de alta conversão",
    prompt:
      "Crie uma landing page premium para uma empresa de serviços, com hero forte, benefícios, prova social, FAQ e CTA.",
  },
  {
    title: "Loja virtual",
    description: "Catálogo e carrinho",
    prompt:
      "Crie uma loja virtual premium com catálogo, filtros, detalhes do produto, carrinho e checkout visual.",
  },
  {
    title: "Sistema de reservas",
    description: "Agenda e confirmação",
    prompt:
      "Crie um sistema de reservas com calendário, escolha de serviço, profissional, horário e confirmação.",
  },
  {
    title: "Dashboard SaaS",
    description: "Métricas e gráficos",
    prompt:
      "Crie um dashboard SaaS moderno com métricas, gráficos, tabela de atividades e navegação lateral.",
  },
  {
    title: "CRM leve",
    description: "Contatos e pipeline",
    prompt:
      "Crie um CRM leve com lista de contatos, pipeline de oportunidades, detalhes do lead e atividades.",
  },
  {
    title: "Portfólio",
    description: "Cases e contato",
    prompt:
      "Crie um portfólio premium com hero, cases, sobre, depoimentos e formulário de contato.",
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
  userName,
  projectFilter = "all",
  focusPromptToken = 0,
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
  userName?: string | null;
  projectFilter?: "all" | "starred" | "mine";
  focusPromptToken?: number;
}) {
  const [tab, setTab] = useState<ProjectTab>("mine");
  const [query, setQuery] = useState("");
  const firstName =
    userName?.trim().split(/\s+/)[0] ||
    (isLoggedIn ? "criador" : "visitante");

  useEffect(() => {
    if (projectFilter === "starred") setTab("mine");
    if (projectFilter === "mine" || projectFilter === "all") setTab("mine");
  }, [projectFilter]);

  useEffect(() => {
    if (!focusPromptToken) return;
    const el = document.getElementById("x09-home-prompt");
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusPromptToken]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...projects];
    if (projectFilter === "starred") {
      // Ainda sem starred no banco — lista vazia até feature existir.
      list = [];
    }
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [projects, projectFilter, query]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-[#F4F4F5]">
      {/* Hero gradiente estilo Lovable — paleta violeta X09 */}
      <div className="relative px-3 pb-0 pt-3 md:px-4 md:pt-4">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 px-4 pb-10 pt-8 shadow-[0_24px_80px_rgba(124,58,237,0.28)] md:px-8 md:pb-14 md:pt-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.28),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(79,70,229,0.35),transparent_40%)]" />

          <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
            <button
              type="button"
              onClick={onOpenBilling}
              className="mb-6 inline-flex items-center rounded-full bg-zinc-950/80 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur transition hover:bg-zinc-950"
            >
              Novo: créditos e deploy em um só fluxo →
            </button>

            <h1 className="text-4xl font-bold tracking-[-0.04em] text-zinc-950 md:text-5xl">
              Vamos construir algo, {firstName}
            </h1>

            {isLoggedIn && creditBalance != null ? (
              <p className="mt-3 text-sm font-medium text-zinc-900/70">
                {creditBalance} créditos disponíveis
              </p>
            ) : null}

            <div className="mt-8 w-full max-w-2xl">
              <PromptComposer
                large
                variant="lovable"
                inputId="x09-home-prompt"
                buildMode={buildMode}
                onBuildModeChange={onBuildModeChange}
                onSubmitPrompt={onSubmitPrompt}
                isGenerating={isGenerating}
                onStop={onStop}
                placeholder="Peça ao X09 para criar uma landing page para…"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card branco de projetos — como Lovable */}
      <div className="relative z-10 -mt-4 flex-1 px-3 pb-8 md:px-4">
        <div className="mx-auto min-h-[420px] max-w-[1200px] rounded-[28px] border border-zinc-200/80 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <label className="relative hidden w-full max-w-[220px] sm:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar projetos"
                  className="h-10 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
                />
              </label>

              <div className="flex flex-wrap items-center gap-1 rounded-full bg-zinc-100 p-1">
                {(
                  [
                    ["mine", "My projects"],
                    ["recent", "Recently viewed"],
                    ["templates", "X09 templates"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                      tab === id
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-800",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setTab("mine");
                setQuery("");
              }}
              className="text-sm font-medium text-violet-700 hover:text-violet-800"
            >
              Browse all →
            </button>
          </div>

          {tab === "templates" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.title}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => void onSubmitPrompt(template.prompt)}
                  className="group overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 text-left transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md disabled:opacity-50"
                >
                  <div className="h-36 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 p-4">
                    <div className="h-full rounded-xl border border-white/25 bg-white/15 backdrop-blur-sm" />
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold text-zinc-900">
                      {template.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {template.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : isLoadingProjects ? (
            <p className="py-16 text-center text-sm text-zinc-500">
              Carregando projetos…
            </p>
          ) : !isLoggedIn ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <FolderOpen className="h-8 w-8 text-violet-500" />
              <p className="text-sm font-medium text-zinc-900">
                Entre para ver seus projetos
              </p>
              <button
                type="button"
                onClick={onRequestLogin}
                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Entrar
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <FolderOpen className="h-8 w-8 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-900">
                {projectFilter === "starred"
                  ? "Nenhum projeto favorito ainda"
                  : "Nenhum projeto ainda"}
              </p>
              <p className="max-w-sm text-sm text-zinc-500">
                Use o campo acima para criar o primeiro app com o X09.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(tab === "recent"
                ? filteredProjects.slice(0, 6)
                : filteredProjects
              ).map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onOpenProject(project.id)}
                  className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                >
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-violet-100 via-fuchsia-50 to-indigo-100">
                    <div className="absolute inset-4 rounded-xl border border-white/80 bg-white/70 shadow-sm backdrop-blur-sm">
                      <div className="space-y-2 p-3">
                        <div className="h-2 w-1/3 rounded-full bg-violet-200" />
                        <div className="h-2 w-2/3 rounded-full bg-zinc-200" />
                        <div className="h-2 w-1/2 rounded-full bg-zinc-200" />
                        <div className="mt-4 h-16 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20" />
                      </div>
                    </div>
                    {project.published_url ? (
                      <span className="absolute bottom-3 left-3 rounded-md bg-zinc-950 px-2 py-1 text-[10px] font-semibold text-white">
                        Published
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-start gap-3 p-4">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-[11px] font-semibold text-white">
                      {project.name.trim().charAt(0).toUpperCase() || "A"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {project.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="h-3 w-3" />
                        Edited{" "}
                        {formatRelative(project.updated_at)}
                      </p>
                      {project.published_url ? (
                        <a
                          href={project.published_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-800"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Abrir
                        </a>
                      ) : null}
                    </div>
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

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
