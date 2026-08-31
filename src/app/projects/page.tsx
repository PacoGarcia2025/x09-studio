import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ProjectHeroCard } from "@/components/projects/ProjectHeroCard";
import { projectCreatePath } from "@/lib/auth/paths";
import { listProjects } from "@/lib/projects/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TEMPLATES = [
  {
    title: "Landing premium",
    description: "Showcase cinematográfico",
    hue: 265,
    prompt:
      "Landing page premium cinematográfica de alta conversão para minha marca, com hero imersivo, prova social, bento de serviços e CTA forte",
  },
  {
    title: "Loja virtual",
    description: "Catálogo e carrinho",
    hue: 200,
    prompt:
      "Loja virtual premium cinematográfica com catálogo de produtos, carrinho e checkout simplificado, visual dark com cor de marca",
  },
  {
    title: "Sistema de reservas",
    description: "Agenda e confirmação",
    hue: 175,
    prompt:
      "Sistema de reservas online premium com calendário, confirmação por e-mail e painel administrativo cinematográfico",
  },
  {
    title: "Dashboard SaaS",
    description: "Métricas e gráficos",
    hue: 240,
    prompt:
      "Dashboard SaaS cinematográfico premium com métricas, gráficos recharts, cards KPI e layout profissional dark",
  },
  {
    title: "CRM leve",
    description: "Contatos e pipeline",
    hue: 155,
    prompt:
      "CRM leve premium com pipeline de vendas, contatos, status e dashboard cinematográfico para equipe comercial",
  },
  {
    title: "Portfólio",
    description: "Showcase e cases",
    hue: 290,
    prompt:
      "Site portfólio showcase premium cinematográfico com cases em bento, sobre mim e formulário de contato elegante",
  },
] as const;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ createError?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const projects = await listProjects();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "criador";
  const firstName = displayName.split(/\s+/)[0] || "criador";
  const avatarLabel = firstName.charAt(0).toUpperCase();
  const workspaceName = `Studio do ${firstName}`;

  return (
    <AppShell
      workspaceName={workspaceName}
      avatarLabel={avatarLabel}
      activeHref="/projects"
    >
      <div className="min-h-full">
        {params.createError ? (
          <div className="px-4 pt-4">
            <p className="mx-auto max-w-3xl rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {params.createError}
            </p>
          </div>
        ) : null}

        <div className="px-3 pt-3 md:px-4 md:pt-4">
          <div className="x09-card relative overflow-hidden rounded-[28px] px-4 pb-28 pt-10 md:px-8 md:pb-32 md:pt-14">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(122,60,255,0.28),transparent_50%),radial-gradient(ellipse_at_90%_100%,rgba(74,131,255,0.18),transparent_45%)]" />

            <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
              <Link
                href="/billing"
                className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3.5 py-1.5 text-xs font-medium text-violet-100 transition hover:bg-violet-500/20"
              >
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Novo
                </span>
                Créditos, GitHub e deploy em um só fluxo →
              </Link>

              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-violet-300">
                Inteligência aplicada
              </p>
              <h1 className="text-[2.35rem] font-semibold leading-[1.1] tracking-[-0.04em] text-white md:text-5xl">
                Vamos construir algo,{" "}
                <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-sky-200 bg-clip-text text-transparent">
                  {firstName}
                </span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400 md:text-base">
                Descreva a ideia. O Studio entrega showcase cinematográfico premium
                por padrão — só muda o visual se você pedir.
              </p>

              <form
                id="prompt"
                action="/projects/new"
                method="get"
                className="mt-8 w-full max-w-[640px]"
              >
                <div className="x09-hero-prompt flex items-center gap-2 p-2 md:p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-500">
                    +
                  </span>
                  <input
                    name="q"
                    placeholder="Peça ao Studio X09 para criar uma landing page para o meu…"
                    className="x09-hero-prompt-input min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none md:text-[17px]"
                  />
                  <button
                    type="submit"
                    className="x09-button-primary h-10 shrink-0 px-4 text-sm"
                  >
                    Construir
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-20 px-3 pb-10 md:-mt-24 md:px-4">
          <div className="x09-card mx-auto min-h-[420px] max-w-[1120px] rounded-[28px] px-4 py-5 md:px-6 md:py-6">
            <div className="mb-6 flex flex-wrap items-center gap-1">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-zinc-500">
                ⌕ Procurar
              </span>
              <span className="rounded-full bg-violet-500/20 px-3.5 py-2 text-sm font-medium text-violet-100 ring-1 ring-violet-400/25">
                Meus projetos
              </span>
              <span className="rounded-full px-3.5 py-2 text-sm font-medium text-zinc-500">
                Visualizados recentemente
              </span>
              <span className="rounded-full px-3.5 py-2 text-sm font-medium text-zinc-500">
                Modelos X09
              </span>
              <Link
                href="/billing"
                className="ml-auto text-sm font-medium text-violet-300 transition hover:text-violet-200"
              >
                Planos →
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {TEMPLATES.map((template) => (
                  <Link
                    key={template.title}
                    href={projectCreatePath(template.prompt)}
                    className="group text-left"
                  >
                    <HeroPreview
                      title={template.title}
                      subtitle={template.description}
                      hue={template.hue}
                    />
                    <CardMeta
                      title={template.title}
                      subtitle={template.description}
                      hue={template.hue}
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                  const hue = hashHue(project.id);
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="group text-left"
                    >
                      <ProjectHeroCard
                        projectId={project.id}
                        title={project.name}
                      />
                      <CardMeta
                        title={project.name}
                        subtitle={`Criado ${formatCreated(project.created_at)}`}
                        hue={hue}
                      />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function HeroPreview({
  title,
  subtitle,
  hue,
}: {
  title: string;
  subtitle?: string;
  hue: number;
}) {
  const short = title.length > 28 ? `${title.slice(0, 26)}…` : title;

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition group-hover:-translate-y-0.5 group-hover:border-violet-400/30">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(145deg, hsl(${hue} 55% 28%), hsl(${(hue + 55) % 360} 60% 22%), hsl(${(hue + 110) % 360} 50% 14%))`,
        }}
      >
        <div className="absolute inset-x-3 top-3 overflow-hidden rounded-xl border border-white/10 bg-black/50 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1.5 border-b border-white/8 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            <span className="ml-2 h-1.5 flex-1 rounded-full bg-white/10" />
          </div>
          <div className="space-y-2.5 px-4 pb-4 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold text-zinc-200">
                {short.split(" ")[0] || "App"}
              </span>
              <span className="rounded-full bg-violet-500/80 px-2 py-0.5 text-[8px] font-semibold text-white">
                Começar
              </span>
            </div>
            <p className="text-[11px] font-bold leading-tight tracking-tight text-white">
              {short}
            </p>
            {subtitle ? (
              <p className="line-clamp-2 text-[9px] leading-snug text-zinc-400">
                {subtitle}
              </p>
            ) : null}
            <div
              className="mt-1 h-10 rounded-lg opacity-90"
              style={{
                background: `linear-gradient(90deg, hsl(${hue} 50% 35% / 0.5), hsl(${(hue + 40) % 360} 55% 40% / 0.35))`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CardMeta({
  title,
  subtitle,
  hue,
}: {
  title: string;
  subtitle: string;
  hue: number;
}) {
  return (
    <div className="mt-3 flex items-center gap-2.5 px-0.5">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 70% 48%), hsl(${hue + 40} 80% 55%))`,
        }}
      >
        {title.trim().charAt(0).toUpperCase() || "A"}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-white">{title}</p>
        <p className="text-[12px] text-zinc-500">{subtitle}</p>
      </div>
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
