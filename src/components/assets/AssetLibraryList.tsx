"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  archiveAssetAction,
  enqueueMeshRigAction,
} from "@/lib/assets/actions";
import { AssetThumb } from "@/components/assets/AssetThumb";
import { MeshPreviewDialog } from "@/components/assets/MeshTurntable";
import type { AssetWithJobs } from "@/lib/assets/types";
import { MESH_CREDIT_COST } from "@/lib/assets/mesh-tiers";
import { sanitizeUserFacingCopy } from "@/lib/assets/user-facing";
import { drainAssetQueue } from "@/components/assets/drainAssetQueue";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isLogoMesh(asset: AssetWithJobs): boolean {
  return (
    asset.meta?.capability === "mesh.logo" ||
    /-logo\.glb$/i.test(asset.original_name)
  );
}

type Filter = "all" | "image" | "mesh";

export function AssetLibraryList({ assets }: { assets: AssetWithJobs[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [preview, setPreview] = useState<{
    id: string;
    name: string;
    kind: "logo" | "object";
  } | null>(null);

  const visible = useMemo(() => {
    if (filter === "all") return assets;
    return assets.filter((asset) => asset.kind === filter);
  }, [assets, filter]);

  if (assets.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Ainda não há arquivos. Gere um 3D ou envie uma foto na página 3D.
      </p>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1">
        {(
          [
            ["all", "Tudo"],
            ["image", "Fotos"],
            ["mesh", "Objetos 3D"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === id
                ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/25"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="space-y-3">
        {visible.map((asset) => {
          const latest = asset.jobs[0];
          const hasFile =
            asset.byte_size > 0 ||
            asset.jobs.some((job) => job.status === "done");
          const canTurntable = asset.kind === "mesh" && hasFile;
          return (
            <li
              key={asset.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-start"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <AssetThumb assetId={asset.id} kind={asset.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {asset.original_name}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {asset.kind === "mesh" ? "objeto 3D" : "foto"} ·{" "}
                    {formatBytes(asset.byte_size)}
                    {asset.meta?.rigged === true ? " · pronto para jogo" : ""}
                  </p>
                  {latest?.status === "failed" && latest.error_message ? (
                    <p className="mt-1 break-words text-[11px] leading-4 text-rose-300/90">
                      {sanitizeUserFacingCopy(latest.error_message)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {canTurntable &&
                !isLogoMesh(asset) &&
                asset.meta?.rigged !== true ? (
                  <button
                    type="button"
                    disabled={busyId === asset.id}
                    onClick={() => {
                      setBusyId(asset.id);
                      void (async () => {
                        const result = await enqueueMeshRigAction(asset.id);
                        if (result.ok) {
                          await drainAssetQueue(result.jobId);
                        }
                        router.refresh();
                        setBusyId(null);
                      })();
                    }}
                    className="rounded-xl px-3 py-1.5 text-xs text-violet-200 ring-1 ring-violet-400/25 hover:bg-violet-500/10 disabled:opacity-50"
                  >
                    Para jogo · {MESH_CREDIT_COST.rig} cr
                  </button>
                ) : null}
                {canTurntable ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPreview({
                        id: asset.id,
                        name: asset.original_name,
                        kind: isLogoMesh(asset) ? "logo" : "object",
                      })
                    }
                    className="rounded-xl px-3 py-1.5 text-xs text-sky-200 ring-1 ring-sky-400/25 hover:bg-sky-500/10"
                  >
                    Visualizar
                  </button>
                ) : null}
                {hasFile ? (
                  <a
                    href={`/api/assets/${asset.id}/file`}
                    download={asset.original_name}
                    className="rounded-xl px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-white/10 hover:text-white"
                  >
                    Download
                  </a>
                ) : (
                  <span className="rounded-xl px-3 py-1.5 text-xs text-zinc-600 ring-1 ring-white/5">
                    Sem arquivo
                  </span>
                )}
                <button
                  type="button"
                  disabled={busyId === asset.id}
                  onClick={() => {
                    setBusyId(asset.id);
                    void archiveAssetAction(asset.id)
                      .then(() => router.refresh())
                      .finally(() => setBusyId(null));
                  }}
                  className="rounded-xl px-3 py-1.5 text-xs text-zinc-500 ring-1 ring-white/10 hover:text-rose-200 disabled:opacity-50"
                >
                  Excluir
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 ? (
        <p className="text-sm text-zinc-500">Nada neste filtro.</p>
      ) : null}
      {preview ? (
        <MeshPreviewDialog
          assetId={preview.id}
          title={preview.name}
          kind={preview.kind}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </>
  );
}
