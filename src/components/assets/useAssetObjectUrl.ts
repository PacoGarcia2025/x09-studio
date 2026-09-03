"use client";

import { useEffect, useState } from "react";

export function useAssetObjectUrl(assetId: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assetId) {
      setUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setUrl(null);

    void fetch(`/api/assets/${assetId}/file`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "O objeto 3D ainda não chegou ao servidor"
              : "Não foi possível abrir o arquivo",
          );
        }
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  return { url, error, loading };
}
