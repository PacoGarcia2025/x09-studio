import Link from "next/link";
import type { CSSProperties } from "react";
import { LandingHeroPrompt } from "@/components/landing/LandingHeroPrompt";
import { StudioAtmosphere } from "@/components/brand/StudioAtmosphere";
import { X09Robot } from "@/components/brand/X09Robot";
import { authLink } from "@/lib/auth/paths";
import { landingRobotGlbExists } from "@/lib/brand/landing-robot.server";

const STAGES = [
  {
    kicker: "01 · Site",
    title: "Prompt vira produto no ar",
    copy: "Planeja, constrói, verifica e publica. Preview ao vivo, não mockup.",
    stat: "3 cr",
    hint: "criar o site",
    accent: "124, 92, 255",
  },
  {
    kicker: "02 · Objeto 3D",
    title: "Uma foto, um GLB a girar",
    copy: "Manda a referência. Sai volume fechado para catálogo, site ou anúncio — alta qualidade no hero.",
    stat: "18–34 cr",
    hint: "comercial ou alta qualidade",
    accent: "47, 158, 255",
  },
  {
    kicker: "03 · Personagem",
    title: "Humanoide pronto para o vale",
    copy: "Pose de frente, esqueleto, passo — e parado/ataque quando o pipeline novo está no ar.",
    stat: "32 cr",
    hint: "personagem para jogo",
    accent: "210, 76, 255",
  },
] as const;

const PIPELINE = [
  "Plan",
  "Build",
  "3D",
  "Verify",
  "Preview",
  "Deploy",
] as const;

type Props = {
  authError?: string | null;
};

export function StudioLanding({ authError }: Props) {
  const hasGlb = landingRobotGlbExists();

  return (
    <main className="x09-landing relative min-h-dvh overflow-x-hidden text-zinc-100">
      <StudioAtmosphere />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-7xl flex-col px-4 py-4 sm:px-5 sm:py-5 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/20 text-sm font-bold text-violet-200 ring-1 ring-violet-400/25">
              X09
            </span>
            <div className="leading-tight">
              <span className="block text-sm font-semibold tracking-wide text-white">
                Studio
              </span>
              <span className="block text-[10px] uppercase tracking-[0.22em] text-violet-300/80">
                Lab de software e 3D
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href={authLink("/login")}
              className="x09-button-secondary px-3 py-2 text-sm sm:px-4"
            >
              Entrar
            </Link>
            <Link
              href={authLink("/signup")}
              className="x09-button-primary px-3 py-2 text-sm sm:px-4"
            >
              Criar conta
            </Link>
          </nav>
        </header>

        {authError ? (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Falha ao confirmar login. Tente entrar novamente ou crie uma conta.
          </div>
        ) : null}

        <section className="x09-hero grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10 lg:py-10">
          <div className="x09-fade-in max-w-2xl space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-violet-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
              Site · objeto 3D · personagem
            </p>

            <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-white md:text-6xl lg:text-[3.35rem]">
              Descreve. Fotografa.
              <span className="mt-1 block bg-gradient-to-r from-violet-200 via-fuchsia-200 to-sky-200 bg-clip-text text-transparent">
                O X09 constrói o resto.
              </span>
            </h1>
            <p className="max-w-xl text-base leading-7 text-zinc-400 md:text-lg">
              Um laboratório: prompt vira site publicado, foto vira GLB a
              girar, humanoide sai com esqueleto e passo — créditos à vista,
              ficheiro na Biblioteca.
            </p>

            <LandingHeroPrompt />
          </div>

          <div className="relative flex min-h-[380px] flex-col items-center justify-center lg:min-h-[520px]">
            <div className="x09-stage">
              <X09Robot hasGlb={hasGlb} />
              <p className="x09-stage-hint">
                {hasGlb
                  ? "Arrasta para orbitar · malha de alta qualidade"
                  : "Palco 3D · espera o GLB em public/landing"}
              </p>
            </div>
            <div className="x09-card relative z-20 mt-5 w-full max-w-md rounded-3xl p-4">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Pipeline</span>
                <span className="font-medium text-emerald-300">online</span>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-2">
                {PIPELINE.map((step, index) => (
                  <div key={step} className="space-y-2">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-sky-400"
                      style={{ opacity: 1 - index * 0.08 }}
                    />
                    <div className="truncate text-[10px] text-zinc-500">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pb-20 pt-6">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">
              Três saídas, um saldo
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              O GLB não é o produto. É o meio.
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400 md:text-base">
              Loja quer o objeto a girar. Jogo quer o passo. Marca quer o
              site com o 3D no hero. O Studio entrega os três — sem segundo
              plano, só créditos.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {STAGES.map((stage) => (
              <article
                key={stage.kicker}
                className="x09-feature-card rounded-[1.75rem] p-6"
                style={
                  {
                    "--x09-accent": stage.accent,
                  } as CSSProperties
                }
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300">
                  {stage.kicker}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  {stage.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {stage.copy}
                </p>
                <p className="mt-5 text-xs text-zinc-500">
                  <span className="font-semibold text-violet-200">
                    {stage.stat}
                  </span>
                  {" · "}
                  {stage.hint}
                </p>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/8 py-8 text-center text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} X09 Studio</p>
          <p className="flex flex-wrap justify-center gap-4">
            <Link href="/legal/privacidade" className="hover:text-violet-200">
              Privacidade
            </Link>
            <Link href="/legal/termos" className="hover:text-violet-200">
              Termos
            </Link>
            <Link href="/billing" className="hover:text-violet-200">
              Créditos
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
