import { FolderOpen, Search } from "lucide-react";
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
    hue: 265,
  },
  {
    title: "Loja virtual",
    description: "Catálogo e carrinho",
    prompt:
      "Crie uma loja virtual premium com catálogo, filtros, detalhes do produto, carrinho e checkout visual.",
    hue: 320,
  },
  {
    title: "Sistema de reservas",
    description: "Agenda e confirmação",
    prompt:
      "Crie um sistema de reservas com calendário, escolha de serviço, profissional, horário e confirmação.",
    hue: 200,
  },
  {
    title: "Dashboard SaaS",
    description: "Métricas e gráficos",
    prompt:
      "Crie um dashboard SaaS moderno com métricas, gráficos, tabela de atividades e navegação lateral.",
    hue: 240,
  },
  {
    title: "CRM leve",
    description: "Contatos e pipeline",
    prompt:
      "Crie um CRM leve com lista de contatos, pipeline de oportunidades, detalhes do lead e atividades.",
    hue: 175,
  },
  {
    title: "Portfólio",
    description: "Cases e contato",
    prompt:
      "Crie um portfólio premium com hero, cases, sobre, depoimentos e formulário de contato.",
    hue: 290,
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
  const [searchOpen, setSearchOpen] = useState(false);
  const firstName =
    userName?.trim().split(/\s+/)[0] ||
    (isLoggedIn ? "criador" : "visitante");

  useEffect(() => {
    if (projectFilter === "starred" || projectFilter === "mine" || projectFilter === "all") {
      setTab("mine");
    }
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
    if (projectFilter === "starred") list = [];
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return list;
  }, [projects, projectFilter, query]);

  const visibleProjects =
    tab === "recent" ? filteredProjects.slice(0, 6) : filteredProjects;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-[#F7F7F8]">
      {/* Hero — gradiente full-bleed estilo Lovable */}
      <div className="relative px-3 pt-3 md:px-4 md:pt-4">
        <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#8B5CF6_0%,#D946EF_45%,#6366F1_100%)] px-4 pb-28 pt-10 md:px-8 md:pb-32 md:pt-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(255,255,255,0.35),transparent_50%),radial-gradient(ellipse_at_90%_100%,rgba(49,46,129,0.35),transparent_45%)]" />

          <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
            <button
              type="button"
              onClick={onOpenBilling}
              className="mb-7 inline-flex items-center gap-2 rounded-full bg-[#1e3a5f]/90 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur transition hover:bg-[#1e3a5f]"
            >
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Novo
              </span>
              Créditos, GitHub e deploy em um só fluxo →
            </button>

            <h1 className="text-[2.35rem] font-bold leading-[1.1] tracking-[-0.04em] text-zinc-950 md:text-5xl">
              Vamos construir algo, {firstName}
            </h1>

            <div className="mt-8 w-full max-w-[640px]">
              <PromptComposer
                large
                variant="lovable"
                inputId="x09-home-prompt"
                buildMode={buildMode}
                onBuildModeChange={onBuildModeChange}
                onSubmitPrompt={onSubmitPrompt}
                isGenerating={isGenerating}
                onStop={onStop}
                placeholder="Peça ao Studio X09 para criar uma landing page para o meu…"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Painel branco de projetos — sobrepõe o hero */}
      <div className="relative z-10 -mt-20 flex-1 px-3 pb-8 md:-mt-24 md:px-4">
        <div className="mx-auto min-h-[440px] max-w-[1120px] rounded-[28px] bg-white px-4 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.10)] md:px-6 md:py-6">
          {/* Abas estilo Lovable */}
          <div className="mb-6 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition",
                searchOpen
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800",
              )}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Procurar</span>
            </button>

            {(
              [
                ["mine", "Meus projetos"],
                ["recent", "Visualizados recentemente"],
                ["templates", "Modelos X09"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  setSearchOpen(false);
                }}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition",
                  tab === id && !searchOpen
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800",
                )}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setTab("mine");
                setQuery("");
                setSearchOpen(false);
              }}
              className="ml-auto text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
            >
              Veja tudo →
            </button>
          </div>

          {searchOpen ? (
            <div className="mb-5">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome do projeto…"
                className="h-11 w-full max-w-md rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </div>
          ) : null}

          {tab === "templates" ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.title}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => void onSubmitPrompt(template.prompt)}
                  className="group text-left transition disabled:opacity-50"
                >
                  <HeroPreview
                    title={template.title}
                    subtitle={template.description}
                    hue={template.hue}
                  />
                  <div className="mt-3 flex items-center gap-2.5 px-0.5">
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
                      style={{
                        background: `linear-gradient(135deg, hsl(${template.hue} 70% 48%), hsl(${template.hue + 40} 80% 55%))`,
                      }}
                    >
                      {template.title.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-zinc-900">
                        {template.title}
                      </p>
                      <p className="text-[12px] text-zinc-500">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : isLoadingProjects ? (
            <p className="py-20 text-center text-sm text-zinc-500">
              Carregando projetos…
            </p>
          ) : !isLoggedIn ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <FolderOpen className="h-8 w-8 text-violet-500" />
              <p className="text-sm font-medium text-zinc-900">
                Entre para ver seus projetos
              </p>
              <button
                type="button"
                onClick={onRequestLogin}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Entrar
              </button>
            </div>
          ) : visibleProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <FolderOpen className="h-8 w-8 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-900">
                {projectFilter === "starred"
                  ? "Nenhum projeto favorito ainda"
                  : "Nenhum projeto ainda"}
              </p>
              <p className="max-w-sm text-sm text-zinc-500">
                Use o campo acima para criar o primeiro app.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onOpenProject(project.id)}
                  className="group text-left"
                >
                  <HeroPreview
                    title={project.name}
                    hue={hashHue(project.id)}
                    liveUrl={project.published_url}
                  />
                  <div className="mt-3 flex items-center gap-2.5 px-0.5">
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
                      style={{
                        background: `linear-gradient(135deg, hsl(${hashHue(project.id)} 70% 48%), hsl(${hashHue(project.id) + 40} 80% 55%))`,
                      }}
                    >
                      {project.name.trim().charAt(0).toUpperCase() || "A"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-zinc-900">
                        {project.name}
                      </p>
                      <p className="text-[12px] text-zinc-500">
                        Criado {formatCreated(project.created_at)}
                      </p>
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

/** Preview tipo “print da hero” — iframe se publicado, senão mock visual limpo. */
function HeroPreview({
  title,
  subtitle,
  hue,
  liveUrl,
}: {
  title: string;
  subtitle?: string;
  hue: number;
  liveUrl?: string | null;
}) {
  const short = title.length > 28 ? `${title.slice(0, 26)}…` : title;

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80 transition group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
      {liveUrl ? (
        <div className="absolute inset-0 overflow-hidden bg-white">
          <iframe
            title={`Preview ${title}`}
            src={liveUrl}
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
            className="pointer-events-none absolute left-0 top-0 h-[250%] w-[250%] origin-top-left scale-[0.4] border-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(145deg, hsl(${hue} 72% 58%), hsl(${(hue + 55) % 360} 78% 52%), hsl(${(hue + 110) % 360} 65% 45%))`,
          }}
        >
          {/* Fake browser chrome */}
          <div className="absolute inset-x-3 top-3 overflow-hidden rounded-xl bg-white/95 shadow-lg shadow-black/10">
            <div className="flex items-center gap-1.5 border-b border-zinc-100 px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              <span className="ml-2 h-1.5 flex-1 rounded-full bg-zinc-100" />
            </div>
            <div className="space-y-2.5 px-4 pb-4 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold text-zinc-800">
                  {short.split(" ")[0] || "App"}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[8px] font-semibold text-white"
                  style={{ background: `hsl(${hue} 70% 45%)` }}
                >
                  Começar
                </span>
              </div>
              <p className="text-[11px] font-bold leading-tight tracking-tight text-zinc-900">
                {short}
              </p>
              {subtitle ? (
                <p className="text-[9px] leading-snug text-zinc-500 line-clamp-2">
                  {subtitle}
                </p>
              ) : (
                <div className="space-y-1 pt-0.5">
                  <div className="h-1 w-[80%] rounded-full bg-zinc-200" />
                  <div className="h-1 w-[60%] rounded-full bg-zinc-100" />
                </div>
              )}
              <div
                className="mt-1 h-10 rounded-lg opacity-90"
                style={{
                  background: `linear-gradient(90deg, hsl(${hue} 65% 92%), hsl(${(hue + 40) % 360} 70% 88%))`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function formatCreated(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "agora";
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia${days > 1 ? "s" : ""}`;
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
