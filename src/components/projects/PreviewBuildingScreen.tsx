"use client";

import Image from "next/image";

const STEPS = ["Plan", "Build", "Verify", "Fix", "Preview"] as const;

type Props = {
  title?: string;
  subtitle?: string;
};

/** Tela premium enquanto o Builder gera o app — compacta para o painel lateral. */
export function PreviewBuildingScreen({
  title = "Construindo seu showcase…",
  subtitle = "Agentes de IA montando páginas, textos e visual do seu produto.",
}: Props) {
  return (
    <div className="x09-preview-building absolute inset-0 z-20 overflow-hidden">
      <div className="x09-cosmos absolute inset-0" aria-hidden />
      <div className="x09-cosmos-grid absolute inset-0 opacity-60" aria-hidden />
      <div className="x09-cosmos-stars absolute inset-0" aria-hidden />

      <div className="x09-preview-building-scroll relative z-10 h-full w-full">
        <div className="x09-preview-building-inner">
          <div className="x09-preview-robot-wrap shrink-0">
            <div className="x09-mascot-glow x09-preview-mascot-glow" aria-hidden />
            <div className="x09-mascot-orbit x09-preview-mascot-orbit" aria-hidden />
            <Image
              src="/landing/x09-robot-mascot.png"
              alt=""
              width={96}
              height={96}
              priority
              className="x09-preview-mascot-img relative z-10 mx-auto"
            />
          </div>

          <div className="x09-preview-copy">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-300">
              X09 Pipeline
            </p>
            <h2 className="x09-preview-title">{title}</h2>
            <p className="x09-preview-subtitle">{subtitle}</p>
          </div>

          <div className="x09-card x09-preview-pipeline w-full rounded-2xl p-3 sm:p-4">
            <div className="mb-2.5 flex items-center justify-between text-[10px] text-zinc-500 sm:text-xs">
              <span>Pipeline ativo</span>
              <span className="font-medium text-emerald-300">online</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {STEPS.map((step, index) => (
                <div key={step} className="min-w-0 space-y-1.5">
                  <div
                    className="x09-preview-step-bar h-1 rounded-full bg-gradient-to-r from-violet-500 to-sky-400"
                    style={{
                      opacity: 1 - index * 0.12,
                      animationDelay: `${index * 0.35}s`,
                    }}
                  />
                  <div className="truncate text-[9px] text-zinc-500 sm:text-[10px]">
                    {step}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-zinc-500 sm:text-xs">
              <span className="x09-preview-pulse h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <span className="truncate">Preview atualiza automaticamente</span>
            </div>
          </div>
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
