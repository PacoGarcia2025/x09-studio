"use client";

import Image from "next/image";

/** Bolha de chat com robô animado — sem mensagens técnicas durante o build. */
export function BuildProgressBubble() {
  return (
    <div className="x09-build-bubble flex max-w-[90%] items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-3.5 py-3 ring-1 ring-violet-400/10">
      <div className="x09-build-runner-track shrink-0" aria-hidden>
        <Image
          src="/landing/x09-robot-mascot.png"
          alt=""
          width={36}
          height={36}
          className="x09-build-runner-img"
        />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-sm font-medium text-violet-100">
          Criando seu site…
        </p>
        <p className="mt-0.5 text-xs text-violet-200/70">
          Isso pode levar alguns minutos. O preview aparece assim que a primeira
          página ficar pronta.
        </p>
        <div className="mt-2 flex gap-1" aria-hidden>
          <span className="x09-build-dot" />
          <span className="x09-build-dot x09-build-dot-delay-1" />
          <span className="x09-build-dot x09-build-dot-delay-2" />
        </div>
      </div>
    </div>
  );
}

/** Converte erros técnicos do pipeline em linguagem amigável. */
export function humanizeBuildError(raw: string): string {
  const text = raw.trim();
  if (!text) return "Não consegui terminar agora. Tente novamente pelo chat.";

  if (/Qualidade insuficiente/i.test(text)) {
    return "Quase pronto — o preview ainda precisa de um ajuste. Descreva no chat o que quer mudar (textos, imagens ou layout).";
  }

  if (/demorou|timeout|Retry/i.test(text)) {
    return "A geração está demorando mais que o normal. Recarregue a página — seu progresso foi salvo e continua de onde parou.";
  }

  if (
    /update_file|create_file|src\/|Import quebrado|Pacote|HTMLDiv|score \d/i.test(
      text,
    )
  ) {
    return "Encontrei um problema ao montar o app. Peça no chat para tentar de novo ou descreva o que quer mudar.";
  }

  if (text.length > 180) {
    return `${text.slice(0, 160).trim()}…`;
  }

  return text;
}
