import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { LandingHeroPrompt } from "@/components/landing/LandingHeroPrompt";
import { StudioAtmosphere } from "@/components/brand/StudioAtmosphere";
import { X09Robot } from "@/components/brand/X09Robot";
import { authLink } from "@/lib/auth/paths";
import { landingRobotGlbExists } from "@/lib/brand/landing-robot.server";

const OFFERS = [
  {
    id: "site",
    title: "Crie um site incrível",
    copy: "Diz o que a sua empresa faz. A gente monta um site bonito e coloca no ar.",
    image: "/landing/offer-site.png",
    accent: "124, 92, 255",
  },
  {
    id: "product",
    title: "Foto vira produto 3D",
    copy: "Manda a foto do seu produto. Ele aparece inteiro, girando, como na loja.",
    image: "/landing/offer-product.png",
    accent: "47, 158, 255",
  },
  {
    id: "logo",
    title: "Logo comum vira logo 3D",
    copy: "O mesmo logotipo de sempre, agora em volume — para o site, o vídeo ou o anúncio.",
    image: "/landing/offer-logo.png",
    accent: "255, 157, 69",
  },
  {
    id: "game",
    title: "Crie jogos",
    copy: "Personagens e objetos prontos para o seu jogo, a partir de uma foto ou de uma ideia.",
    image: "/landing/offer-game.png",
    accent: "210, 76, 255",
  },
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
              <span className="block text-[11px] text-violet-300/80">
                Sites, 3D e jogos
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
              Começar grátis
            </Link>
          </nav>
        </header>

        {authError ? (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Não deu para entrar. Tente de novo ou crie uma conta.
          </div>
        ) : null}

        <section className="x09-hero grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8 lg:py-10">
          <div className="x09-fade-in max-w-xl space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-200">
              Sem precisar saber de tecnologia
            </p>

            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-white md:text-6xl lg:text-[3.5rem]">
              Crie um site incrível.
              <span className="mt-1 block bg-gradient-to-r from-violet-200 via-fuchsia-200 to-sky-200 bg-clip-text text-transparent">
                Ou transforme uma foto em 3D.
              </span>
            </h1>
            <p className="max-w-lg text-base leading-7 text-zinc-400 md:text-lg">
              Também dá para criar jogos e deixar o seu logotipo em 3D. Você
              escreve o que quer — o X09 faz o resto.
            </p>

            <LandingHeroPrompt />
          </div>

          <div className="relative flex min-h-[420px] flex-col items-center justify-center lg:min-h-[520px]">
            <div className="x09-stage">
              <X09Robot hasGlb={hasGlb} />
              <p className="x09-stage-hint">
                <svg
                  viewBox="0 0 24 24"
                  className="x09-stage-hint-icon"
                  aria-hidden
                >
                  <path
                    fill="currentColor"
                    d="M13 2a3 3 0 0 1 3 3v6.2l1.4-.7a2.5 2.5 0 0 1 3.4 1.1l.2.4a2.5 2.5 0 0 1-.8 3.2L14.5 20H9a5 5 0 0 1-5-5V9.5A1.5 1.5 0 0 1 5.5 8H7V5a3 3 0 0 1 3-3h3Zm-1 2h-2a1 1 0 0 0-1 1v7H5.5a.5.5 0 0 0-.5.5V15a3 3 0 0 0 3 3h4.7l5.3-3.8a.5.5 0 0 0 .16-.64l-.2-.4a.5.5 0 0 0-.68-.22L13 15.2V5a1 1 0 0 0-1-1Z"
                  />
                </svg>
                <span className="x09-stage-hint-mouse">
                  Arraste o mouse sobre o robô para girar
                </span>
                <span className="x09-stage-hint-touch">
                  Arraste o dedo sobre o robô para girar
                </span>
              </p>
            </div>
          </div>
        </section>

        <section className="pb-20 pt-4">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              O que você pode criar
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400 md:text-base">
              Escolhe uma ideia. Não precisa entender de site, de 3D nem de
              jogo — só do seu negócio.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {OFFERS.map((offer) => (
              <article
                key={offer.id}
                className="x09-feature-card overflow-hidden rounded-[1.75rem]"
                style={
                  {
                    "--x09-accent": offer.accent,
                  } as CSSProperties
                }
              >
                <div className="x09-offer-shot">
                  <Image
                    src={offer.image}
                    alt={offer.title}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white">
                    {offer.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {offer.copy}
                  </p>
                </div>
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
              Preços
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
