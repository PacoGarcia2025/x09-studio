"use client";

import { useEffect } from "react";

const CHUNK_RELOAD_KEY = "x09-chunk-reload";

function isStaleChunkError(error: Error): boolean {
  const name = error.name || "";
  const message = error.message || "";
  return (
    name === "ChunkLoadError" ||
    /loading chunk \d+ failed/i.test(message) ||
    /failed to fetch dynamically imported module/i.test(message)
  );
}

export function ClientRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const staleChunk = isStaleChunkError(error);

  useEffect(() => {
    if (!staleChunk) return;
    try {
      if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        return;
      }
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    } catch {
      /* private mode */
    }
    window.location.reload();
  }, [staleChunk]);

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
          {staleChunk
            ? "O site acabou de atualizar. Recarrega a página para abrir a Biblioteca."
            : error.message || "Erro no JavaScript desta tela."}
        </p>
        <button
          type="button"
          onClick={() => {
            if (staleChunk) {
              window.location.reload();
              return;
            }
            reset();
          }}
          className="rounded-2xl bg-violet-500/20 px-4 py-2.5 text-sm text-violet-100 ring-1 ring-violet-400/30"
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
