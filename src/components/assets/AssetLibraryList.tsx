"use client";

import { useTransition } from "react";
import {
  archiveAssetAction,
  cancelAssetJobAction,
} from "@/lib/assets/actions";
import { StubMeshGenerateControls } from "@/components/assets/StubMeshGenerateControls";
import type { AssetWithJobs } from "@/lib/assets/types";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function jobTone(status: string): string {
  if (status === "queued") return "text-amber-200";
  if (status === "cancelled") return "text-zinc-500";
  if (status === "done") return "text-emerald-200";
  if (status === "failed") return "text-rose-300";
  return "text-zinc-400";
}

export function AssetLibraryList({ assets }: { assets: AssetWithJobs[] }) {
  const [pending, start] = useTransition();

  if (assets.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Nenhum arquivo na biblioteca ainda.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {assets.map((asset) => {
        const latest = asset.jobs[0];
        const canPreview = /^(image|thumbnail|texture|hdri)$/.test(asset.kind);
        return (
          <li
            key={asset.id}
            className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {canPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/assets/${asset.id}/file`}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
                />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-[10px] uppercase tracking-wider text-zinc-500 ring-1 ring-white/10">
                  {asset.kind}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {asset.original_name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {asset.kind} · {formatBytes(asset.byte_size)} · {asset.source}
                </p>
                {latest ? (
                  <p className={`mt-1 text-xs ${jobTone(latest.status)}`}>
                    Fila: {latest.operation ?? "job"} · {latest.status}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-start gap-2">
              {asset.kind === "image" ? (
                <StubMeshGenerateControls
                  sourceAssetId={asset.id}
                  label="Gerar mesh (exemplo)"
                />
              ) : null}
              <a
                href={`/api/assets/${asset.id}/file`}
                className="rounded-xl px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-white/10 hover:text-white"
              >
                Abrir
              </a>
              {latest?.status === "queued" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(() => {
                      void cancelAssetJobAction(latest.id);
                    })
                  }
                  className="rounded-xl px-3 py-1.5 text-xs text-amber-200 ring-1 ring-amber-400/20 hover:bg-amber-500/10 disabled:opacity-50"
                >
                  Cancelar fila
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(() => {
                    void archiveAssetAction(asset.id);
                  })
                }
                className="rounded-xl px-3 py-1.5 text-xs text-zinc-500 ring-1 ring-white/10 hover:text-rose-200 disabled:opacity-50"
              >
                Remover
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
