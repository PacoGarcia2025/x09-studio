import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ProjectsBoard } from "@/components/projects/ProjectsBoard";
import { listProjects } from "@/lib/projects/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TEMPLATES = [
  {
    title: "Landing premium",
    description: "Showcase cinematográfico",
    hue: 265,
    image: "/landing/offer-site.png",
    prompt:
      "Landing page premium cinematográfica de alta conversão para minha marca, com hero imersivo, prova social, bento de serviços e CTA forte",
  },
  {
    title: "Loja virtual",
    description: "Catálogo e carrinho",
    hue: 200,
    image: "/landing/offer-product.png",
    prompt:
      "Loja virtual premium cinematográfica com catálogo de produtos, carrinho e checkout simplificado, visual dark com cor de marca",
  },
  {
    title: "Sistema de reservas",
    description: "Agenda e confirmação",
    hue: 175,
    image: "/templates/reservas.png",
    prompt:
      "Sistema de reservas online premium com calendário, confirmação por e-mail e painel administrativo cinematográfico",
  },
  {
    title: "Dashboard SaaS",
    description: "Métricas e gráficos",
    hue: 240,
    image: "/templates/dashboard.png",
    prompt:
      "Dashboard SaaS cinematográfico premium com métricas, gráficos recharts, cards KPI e layout profissional dark",
  },
  {
    title: "CRM leve",
    description: "Contatos e pipeline",
    hue: 155,
    image: "/templates/crm.png",
    prompt:
      "CRM leve premium com pipeline de vendas, contatos, status e dashboard cinematográfico para equipe comercial",
  },
  {
    title: "Portfólio",
    description: "Showcase e cases",
    hue: 290,
    image: "/templates/portfolio.png",
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
          <ProjectsBoard projects={projects} templates={TEMPLATES} />
        </div>
      </div>
    </AppShell>
  );
}
