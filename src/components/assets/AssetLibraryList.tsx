"use client";

import { useState, useTransition } from "react";
import {
  archiveAssetAction,
  cancelAssetJobAction,
} from "@/lib/assets/actions";
import { MeshPreviewDialog } from "@/components/assets/MeshTurntable";
import {
  ImageMeshActions,
  RetextureControls,
} from "@/components/assets/StubMeshGenerateControls";
import type { AssetWithJobs } from "@/lib/assets/types";
import { sanitizeUserFacingCopy } from "@/lib/assets/user-facing";

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

function isLogoMesh(asset: AssetWithJobs): boolean {
  return (
    asset.meta?.capability === "mesh.logo" ||
    /-logo\.glb$/i.test(asset.original_name)
  );
}

export function AssetLibraryList({
  assets,
  gpuMesh = false,
  commercialMesh = false,
}: {
  assets: AssetWithJobs[];
  gpuMesh?: boolean;
  commercialMesh?: boolean;
}) {
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<{
    id: string;
    name: string;
    kind: "logo" | "object";
    bust: number;
  } | null>(null);

  if (assets.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Nenhum arquivo na biblioteca ainda.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
      {assets.map((asset) => {
        const latest = asset.jobs[0];
        const hasFile =
          asset.byte_size > 0 ||
          asset.jobs.some((job) => job.status === "done");
        const canOpen = hasFile;
        const canTurntable = asset.kind === "mesh" && hasFile;
        const canPreview = /^(image|thumbnail|texture|hdri)$/.test(asset.kind);
        const showRetexture =
          commercialMesh && canTurntable && !isLogoMesh(asset);
        return (
          <li
            key={asset.id}
            className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 items-start gap-3">
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {asset.original_name}
                </p>
                {canTurntable ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPreview({
                        id: asset.id,
                        name: asset.original_name,
                        kind: isLogoMesh(asset) ? "logo" : "object",
                        bust: asset.byte_size || Date.now(),
                      })
                    }
                    className="mt-1 text-xs text-sky-200 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-100"
                  >
                    Ver 360°
                  </button>
                ) : asset.kind === "mesh" ? (
                  <p className="mt-1 text-[11px] text-zinc-600">
                    360° aparece depois de processar o job
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-zinc-500">
                  {asset.kind} · {formatBytes(asset.byte_size)} · {asset.source}
                </p>
                {latest ? (
                  <p className={`mt-1 text-xs ${jobTone(latest.status)}`}>
                    Fila: {latest.operation ?? "job"} · {latest.status}
                  </p>
                ) : null}
                {latest?.status === "failed" && latest.error_message ? (
                  <p className="mt-1 break-words text-[11px] leading-4 text-rose-300/90">
                    {sanitizeUserFacingCopy(latest.error_message)}
                  </p>
                ) : null}
              </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {canTurntable ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPreview({
                        id: asset.id,
                        name: asset.original_name,
                        kind: isLogoMesh(asset) ? "logo" : "object",
                        bust: asset.byte_size || Date.now(),
                      })
                    }
                    className="rounded-xl px-3 py-1.5 text-xs text-sky-200 ring-1 ring-sky-400/25 hover:bg-sky-500/10"
                  >
                    Ver 360°
                  </button>
                ) : null}
                {canOpen ? (
                  <a
                    href={`/api/assets/${asset.id}/file`}
                    className="rounded-xl px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-white/10 hover:text-white"
                  >
                    Abrir
                  </a>
                ) : (
                  <span className="rounded-xl px-3 py-1.5 text-xs text-zinc-600 ring-1 ring-white/5">
                    Sem arquivo
                  </span>
                )}
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
                    Cancelar
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
            </div>
            {asset.kind === "image" ? (
              <ImageMeshActions
                sourceAssetId={asset.id}
                gpuMesh={gpuMesh}
                commercialMesh={commercialMesh}
              />
            ) : null}
            {showRetexture ? (
              <RetextureControls sourceAssetId={asset.id} />
            ) : null}
          </li>
        );
      })}
      </ul>
      {preview ? (
        <MeshPreviewDialog
          src={`/api/assets/${preview.id}/file?v=${preview.bust}`}
          title={preview.name}
          kind={preview.kind}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </>
  );
}
