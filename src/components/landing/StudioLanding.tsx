import Link from "next/link";
import type { CSSProperties } from "react";
import { LandingHeroPrompt } from "@/components/landing/LandingHeroPrompt";
import { StudioAtmosphere } from "@/components/brand/StudioAtmosphere";
import { X09Robot } from "@/components/brand/X09Robot";
import { authLink } from "@/lib/auth/paths";

const FEATURES = [
  {
    eyebrow: "Inteligência aplicada",
    title: "IA que trabalha com contexto",
    copy: "Agentes de plano, build e verificação conectados ao seu brief — não apenas uma caixa de texto.",
    accent: "124, 92, 255",
  },
  {
    eyebrow: "Operação autônoma",
    title: "Do prompt ao preview",
    copy: "Planeje, construa e corrija apps React completos com pipeline especializado em tempo real.",
    accent: "47, 158, 255",
  },
  {
    eyebrow: "Engenharia sob medida",
    title: "Software pronto para publicar",
    copy: "Preview Sandpack, build estático e link público — produto funcional, não só protótipo.",
    accent: "210, 76, 255",
  },
] as const;

const PIPELINE = [
  "Plan",
  "Build",
  "Verify",
  "Fix",
  "Preview",
  "Deploy",
] as const;

type Props = {
  authError?: string | null;
};

export function StudioLanding({ authError }: Props) {
  return (
    <main className="x09-landing relative min-h-screen overflow-hidden text-zinc-100">
      <StudioAtmosphere />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-5 md:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/20 text-sm font-bold text-violet-200 ring-1 ring-violet-400/25">
              X09
            </span>
            <div className="leading-tight">
              <span className="block text-sm font-semibold tracking-wide text-white">
                Studio
              </span>
              <span className="block text-[10px] uppercase tracking-[0.22em] text-violet-300/80">
                AI Software Lab
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={authLink("/login")}
              className="x09-button-secondary hidden px-4 py-2 text-sm sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href={authLink("/signup")}
              className="x09-button-primary px-4 py-2 text-sm"
            >
              Criar conta
            </Link>
          </div>
        </header>

        {authError ? (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Falha ao confirmar login. Tente entrar novamente ou crie uma conta.
          </div>
        ) : null}

        <section className="x09-hero grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:py-16">
          <div className="x09-fade-in max-w-2xl space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-violet-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 shadow-[0_0_12px_#8b5cf6]" />
              Inteligência aplicada
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-6xl lg:text-[3.4rem]">
                Descreva sua ideia.
                <span className="block bg-gradient-to-r from-violet-200 via-fuchsia-200 to-sky-200 bg-clip-text text-transparent">
                  O X09 constrói o sistema.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-7 text-zinc-400 md:text-lg">
                Estratégia, engenharia e inteligência artificial reunidas em um
                laboratório que planeja, constrói, verifica e publica software
                a partir do seu prompt.
              </p>
            </div>

            <LandingHeroPrompt />

            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              {[
                ["6", "agentes no pipeline"],
                ["CI", "Verify + Auto Fix"],
                ["∞", "preview e deploy"],
              ].map(([metric, label]) => (
                <div key={label} className="x09-card-soft rounded-2xl p-4">
                  <div className="text-2xl font-semibold text-white">{metric}</div>
                  <div className="mt-1 text-xs text-zinc-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex min-h-[420px] flex-col items-center justify-center lg:min-h-[480px]">
            <div className="relative z-10 flex w-full max-w-md flex-col items-center">
              <X09Robot />
            </div>
            <div className="x09-card relative z-20 mt-6 w-full max-w-md rounded-3xl p-4 lg:mt-8">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Pipeline ativo</span>
                <span className="font-medium text-emerald-300">online</span>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-2">
                {PIPELINE.map((step, index) => (
                  <div key={step} className="space-y-2">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-sky-400"
                      style={{ opacity: 1 - index * 0.09 }}
                    />
                    <div className="truncate text-[10px] text-zinc-500">{step}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pb-16 pt-4">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">
              Manifesto de experiência
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Software que as equipes querem usar
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400 md:text-base">
              IA, automação, preview ao vivo e publicação formam uma única camada
              operacional — do primeiro prompt ao link público.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="x09-feature-card rounded-[1.75rem] p-6"
                style={
                  {
                    "--x09-accent": feature.accent,
                  } as CSSProperties
                }
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300">
                  {feature.eyebrow}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {feature.copy}
                </p>
              </article>
            ))}
          </div>
        </section>

        <footer className="border-t border-white/8 py-8 text-center text-xs text-zinc-500">
          <p>
            Tecnologia, inteligência e design para quem escolheu liderar o
            próximo ciclo.
          </p>
          <p className="mt-2">© {new Date().getFullYear()} X09 Studio</p>
        </footer>
      </div>
    </main>
  );
}
