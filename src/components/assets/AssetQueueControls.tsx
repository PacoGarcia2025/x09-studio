"use client";

import { useState, useTransition } from "react";
import { tickAssetQueueAction } from "@/lib/asset-jobs/actions";

export function AssetQueueControls({
  queuedCount,
  hint,
}: {
  queuedCount: number;
  hint?: string;
}) {
  const [pending, start] = useTransition();
  const [tickMessage, setTickMessage] = useState<string | null>(null);

  const idle =
    queuedCount === 0
      ? tickMessage
        ? null
        : "Nada à espera. Se criou um mesh, abra o cartão novo na lista."
      : queuedCount === 1
        ? "1 job na fila."
        : `${queuedCount} jobs na fila.`;

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={pending || queuedCount === 0}
          onClick={() =>
            start(async () => {
              const result = await tickAssetQueueAction();
              setTickMessage(result.ok ? result.message : result.error);
            })
          }
          className="x09-button-secondary rounded-2xl px-4 py-2 text-sm disabled:opacity-50"
        >
          {pending ? "Processando…" : "Processar próximo job"}
        </button>
        {idle ? <p className="text-xs text-zinc-400">{idle}</p> : null}
      </div>
      {tickMessage ? (
        <p className="max-w-sm text-xs text-emerald-200/90">{tickMessage}</p>
      ) : null}
      {queuedCount === 0 && hint ? (
        <p className="max-w-sm text-xs text-zinc-600">{hint}</p>
      ) : null}
    </div>
  );
}
