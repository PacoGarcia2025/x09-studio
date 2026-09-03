"use client";

import { useAssetObjectUrl } from "@/components/assets/useAssetObjectUrl";

export function AssetThumb({
  assetId,
  kind,
  className = "h-14 w-14",
}: {
  assetId: string;
  kind: string;
  className?: string;
}) {
  const previewable = /^(image|thumbnail|texture|hdri)$/.test(kind);
  const { url, error, loading } = useAssetObjectUrl(previewable ? assetId : null);

  if (!previewable) {
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-xl bg-white/[0.04] text-[10px] uppercase tracking-wider text-zinc-500 ring-1 ring-white/10 ${className}`}
      >
        {kind === "mesh" ? "3D" : kind}
      </span>
    );
  }

  if (loading) {
    return (
      <span
        className={`shrink-0 animate-pulse rounded-xl bg-white/[0.06] ring-1 ring-white/10 ${className}`}
      />
    );
  }

  if (error || !url) {
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-xl bg-white/[0.04] text-[9px] leading-tight text-zinc-600 ring-1 ring-white/10 ${className}`}
        title={error ?? "Sem preview"}
      >
        foto
      </span>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt=""
      className={`shrink-0 rounded-xl object-cover ring-1 ring-white/10 ${className}`}
    />
  );
}
