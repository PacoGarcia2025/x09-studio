"use client";

export function ClientRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[50vh] place-items-center px-6 py-16 text-center">
      <div className="max-w-md space-y-4">
        <p className="text-xs uppercase tracking-[0.18em] text-violet-300">
          3D / Biblioteca
        </p>
        <h1 className="text-xl font-semibold text-white">
          Esta página falhou ao abrir
        </h1>
        <p className="text-sm leading-6 text-zinc-400">
          {error.message || "Erro no JavaScript desta tela."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-2xl bg-violet-500/20 px-4 py-2.5 text-sm text-violet-100 ring-1 ring-violet-400/30"
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
