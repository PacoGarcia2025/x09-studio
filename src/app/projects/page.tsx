import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ProjectHeroCard } from "@/components/projects/ProjectHeroCard";
import { listProjects } from "@/lib/projects/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TEMPLATES = [
  {
    title: "Landing premium",
    description: "Site de alta conversão",
    hue: 265,
  },
  {
    title: "Loja virtual",
    description: "Catálogo e carrinho",
    hue: 320,
  },
  {
    title: "Sistema de reservas",
    description: "Agenda e confirmação",
    hue: 200,
  },
  {
    title: "Dashboard SaaS",
    description: "Métricas e gráficos",
    hue: 240,
  },
  {
    title: "CRM leve",
    description: "Contatos e pipeline",
    hue: 175,
  },
  {
    title: "Portfólio",
    description: "Cases e contato",
    hue: 290,
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
      <div className="min-h-full bg-[#F7F7F8]">
        {params.createError ? (
          <div className="px-4 pt-4">
            <p className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {params.createError}
            </p>
          </div>
        ) : null}
        {/* Hero Lovable */}
        <div className="px-3 pt-3 md:px-4 md:pt-4">
          <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#8B5CF6_0%,#D946EF_45%,#6366F1_100%)] px-4 pb-28 pt-10 md:px-8 md:pb-32 md:pt-14">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(255,255,255,0.35),transparent_50%),radial-gradient(ellipse_at_90%_100%,rgba(49,46,129,0.35),transparent_45%)]" />

            <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
              <Link
                href="/billing"
                className="mb-7 inline-flex items-center gap-2 rounded-full bg-[#1e3a5f]/90 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur transition hover:bg-[#1e3a5f]"
              >
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Novo
                </span>
                Créditos, GitHub e deploy em um só fluxo →
              </Link>

              <h1 className="text-[2.35rem] font-bold leading-[1.1] tracking-[-0.04em] text-zinc-950 md:text-5xl">
                Vamos construir algo, {firstName}
              </h1>

              <form
                id="prompt"
                action="/projects/new"
                method="get"
                className="mt-8 w-full max-w-[640px]"
              >
                <div className="flex items-center gap-2 rounded-[28px] border border-white/70 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.18)] md:p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-400">
                    +
                  </span>
                  <input
                    name="q"
                    placeholder="Peça ao Studio X09 para criar uma landing page para o meu…"
                    className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 md:text-[17px]"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    Construir
                    <span className="opacity-70">▾</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Painel branco de projetos */}
        <div className="relative z-10 -mt-20 px-3 pb-10 md:-mt-24 md:px-4">
          <div className="mx-auto min-h-[420px] max-w-[1120px] rounded-[28px] bg-white px-4 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.10)] md:px-6 md:py-6">
            <div className="mb-6 flex flex-wrap items-center gap-1">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-zinc-500">
                ⌕ Procurar
              </span>
              <span className="rounded-full bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white">
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
                className="ml-auto text-sm font-medium text-violet-700 transition hover:text-violet-800"
              >
                Planos →
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {TEMPLATES.map((template) => (
                  <Link
                    key={template.title}
                    href="/projects/new"
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
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80 transition group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(145deg, hsl(${hue} 72% 58%), hsl(${(hue + 55) % 360} 78% 52%), hsl(${(hue + 110) % 360} 65% 45%))`,
        }}
      >
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
              <p className="line-clamp-2 text-[9px] leading-snug text-zinc-500">
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
        <p className="truncate text-[13px] font-semibold text-zinc-900">
          {title}
        </p>
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
