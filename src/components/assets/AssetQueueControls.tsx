"use client";

import { useState, useTransition } from "react";
import { tickAssetQueueAction } from "@/lib/asset-jobs/actions";

export function AssetQueueControls() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await tickAssetQueueAction();
            setMessage(
              result.ok
                ? result.message
                : result.error,
            );
          })
        }
        className="x09-button-secondary rounded-2xl px-4 py-2 text-sm disabled:opacity-50"
      >
        {pending ? "Processando…" : "Processar próximo job"}
      </button>
      {message ? (
        <p className="text-xs text-zinc-500">{message}</p>
      ) : (
        <p className="text-xs text-zinc-500">
          Ingest e mesh.generate (stub) — sem GPU.
        </p>
      )}
    </div>
  );
}
