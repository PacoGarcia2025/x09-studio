"use client";

import Image from "next/image";

const STEPS = ["Plan", "Build", "Verify", "Fix", "Preview"] as const;

type Props = {
  title?: string;
  subtitle?: string;
};

/** Tela premium enquanto o Builder gera o app (mesmo mascote da landing). */
export function PreviewBuildingScreen({
  title = "Construindo seu showcase…",
  subtitle = "Agentes de IA planejando, codando e verificando cada detalhe.",
}: Props) {
  return (
    <div className="x09-preview-building absolute inset-0 z-20 overflow-hidden">
      <div className="x09-cosmos absolute inset-0" aria-hidden />
      <div className="x09-cosmos-grid absolute inset-0 opacity-60" aria-hidden />
      <div className="x09-cosmos-stars absolute inset-0" aria-hidden />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 py-10 text-center">
        <div className="x09-preview-robot-wrap mb-8">
          <div className="x09-mascot-glow" aria-hidden />
          <div className="x09-mascot-orbit" aria-hidden />
          <Image
            src="/landing/x09-robot-mascot.png"
            alt=""
            width={200}
            height={200}
            priority
            className="x09-mascot-img relative z-10 mx-auto"
          />
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-violet-300">
          X09 Pipeline
        </p>
        <h2 className="max-w-md text-2xl font-semibold tracking-tight text-white md:text-3xl">
          {title}
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">{subtitle}</p>

        <div className="x09-card mt-8 w-full max-w-md rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
            <span>Pipeline ativo</span>
            <span className="font-medium text-emerald-300">online</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {STEPS.map((step, index) => (
              <div key={step} className="space-y-2">
                <div
                  className="x09-preview-step-bar h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-sky-400"
                  style={{
                    opacity: 1 - index * 0.12,
                    animationDelay: `${index * 0.35}s`,
                  }}
                />
                <div className="truncate text-[10px] text-zinc-500">{step}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
          <span className="x09-preview-pulse h-2 w-2 rounded-full bg-violet-400" />
          Aguarde — o preview atualiza automaticamente
        </div>
      </div>
    </div>
  );
}

export function isPlaceholderPreviewContent(files: Record<string, string>): boolean {
  const home =
    files["src/pages/HomePage.tsx"] ??
    files["pages/HomePage.tsx"] ??
    files["/pages/HomePage.tsx"] ??
    "";
  return /Gerando seu app|Em instantes esta página será substituída|Aguardando geração/i.test(
    home,
  );
}
