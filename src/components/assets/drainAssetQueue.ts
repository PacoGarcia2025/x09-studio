"use client";

import { sanitizeUserFacingCopy } from "@/lib/assets/user-facing";

type TickPayload = {
  ok?: boolean;
  error?: string;
  done?: boolean;
  status?: string | null;
  message?: string;
  watch?: {
    status: string;
    error_message: string | null;
  } | null;
};

export async function drainAssetQueue(
  jobId: string | undefined,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
) {
  for (let i = 0; i < 360; i += 1) {
    if (signal?.aborted) return "Geração cancelada.";
    const response = await fetch("/api/assets/queue/tick", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobId ? { jobId } : {}),
      signal,
    });
    const text = await response.text();
    let tick: TickPayload;
    try {
      tick = JSON.parse(text) as TickPayload;
    } catch {
      return "O servidor cortou a geração. Tente de novo — o arquivo pode aparecer na Biblioteca.";
    }
    if (!response.ok || tick.ok === false) {
      return sanitizeUserFacingCopy(
        tick.error || "Não foi possível avançar a geração.",
      );
    }

    const status = tick.watch?.status ?? tick.status;
    const message =
      tick.watch?.error_message || tick.message || "A gerar o objeto 3D…";
    if (status === "failed" || status === "skipped" || status === "cancelled") {
      return sanitizeUserFacingCopy(message);
    }
    if (jobId ? status === "done" : tick.done) {
      return null;
    }
    onProgress?.(sanitizeUserFacingCopy(message));
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  return "Ainda a gerar. Abra a Biblioteca daqui a pouco — o arquivo entra sozinho.";
}
