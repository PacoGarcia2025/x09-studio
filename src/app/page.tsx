import Link from "next/link";
import { redirect } from "next/navigation";
import { X09Robot } from "@/components/brand/X09Robot";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/projects");

  return (
    <main className="x09-bg relative min-h-screen overflow-hidden text-zinc-100">
      <div className="pointer-events-none absolute inset-0 x09-grid" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/20 text-violet-200">
              X09
            </span>
            <span className="text-sm font-semibold tracking-wide">Studio</span>
          </Link>
          <Link
            href="/login"
            className="x09-muted-button rounded-2xl px-4 py-2 text-sm text-zinc-300"
          >
            Entrar
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr]">
          <div className="x09-fade-in max-w-3xl space-y-8">
            <div className="inline-flex rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-violet-200">
              AI Software Lab
            </div>
            <div className="space-y-5">
              <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white md:text-7xl">
                Descreva sua ideia. O X09 constrói o sistema.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-zinc-400">
                Um laboratório de IA para planejar, construir, verificar e
                corrigir software com agentes especializados trabalhando em
                tempo real.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/projects/new"
                className="x09-button rounded-2xl px-6 py-3 text-center text-sm font-semibold text-white"
              >
                Criar Projeto
              </Link>
              <Link
                href="/login"
                className="x09-muted-button rounded-2xl px-6 py-3 text-center text-sm font-medium text-zinc-200"
              >
                Ver Demonstração
              </Link>
            </div>
            <div className="grid gap-3 pt-6 sm:grid-cols-3">
              {[
                ["6", "agentes no pipeline"],
                ["CI", "Verify + Auto Fix"],
                ["∞", "preview e deploy preparados"],
              ].map(([metric, label]) => (
                <div key={label} className="x09-card-soft rounded-3xl p-4">
                  <div className="text-2xl font-semibold text-white">{metric}</div>
                  <div className="mt-1 text-xs text-zinc-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <X09Robot />
            <div className="x09-card absolute bottom-8 left-2 right-2 rounded-3xl p-4 sm:left-10 sm:right-10">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Pipeline ativo</span>
                <span className="text-emerald-300">online</span>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-2">
                {["Plan", "Build", "Verify", "Fix", "Preview", "Deploy"].map(
                  (step, index) => (
                    <div key={step} className="space-y-2">
                      <div
                        className="h-1.5 rounded-full bg-violet-500/80"
                        style={{ opacity: 1 - index * 0.09 }}
                      />
                      <div className="truncate text-[10px] text-zinc-500">{step}</div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
