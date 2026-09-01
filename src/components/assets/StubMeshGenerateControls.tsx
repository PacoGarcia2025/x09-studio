"use client";

import { useState, useTransition } from "react";
import { enqueueMeshGenerateAction } from "@/lib/assets/actions";

export function StubMeshGenerateControls({
  sourceAssetId,
  label,
}: {
  sourceAssetId?: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await enqueueMeshGenerateAction(sourceAssetId);
            setMessage(result.ok ? "Job mesh.generate na fila." : result.error);
          })
        }
        className="rounded-xl px-3 py-1.5 text-xs text-violet-200 ring-1 ring-violet-400/25 hover:bg-violet-500/10 disabled:opacity-50"
      >
        {pending ? "Enfileirando…" : label}
      </button>
      {message ? (
        <p className="text-[11px] leading-4 text-zinc-500">{message}</p>
      ) : null}
    </div>
  );
}
