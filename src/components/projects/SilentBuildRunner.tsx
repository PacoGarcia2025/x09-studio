"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  startBuildAction,
  tickBuildAction,
} from "@/lib/pipeline/builder.actions";

/**
 * Roda o Builder sem UI técnica — só callbacks de progresso.
 */
export function SilentBuildRunner({
  planId,
  enabled,
  runToken = 0,
  onProgress,
  onSuccess,
  onError,
}: {
  planId: string | null;
  enabled: boolean;
  /** Incrementa a cada novo "OK, construir" para permitir reexecução. */
  runToken?: number;
  onProgress?: (message: string) => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}) {
  const runningRef = useRef(false);
  const startedKeyRef = useRef<string | null>(null);

  const run = useCallback(async () => {
    if (!planId || runningRef.current) return;
    runningRef.current = true;
    onProgress?.("Montando as páginas do seu app…");

    const start = await startBuildAction(planId);
    if (!start.ok) {
      runningRef.current = false;
      onError?.(start.error);
      return;
    }

    let guard = 0;
    while (guard < 80) {
      guard += 1;
      const tick = await tickBuildAction(planId);
      if (!tick.ok) {
        runningRef.current = false;
        onError?.(tick.error);
        return;
      }
      if (tick.message) onProgress?.(tick.message);
      if (tick.done) {
        runningRef.current = false;
        if (tick.failed) {
          onError?.(tick.message || "Não consegui terminar a geração.");
        } else {
          onSuccess?.();
        }
        return;
      }
    }

    runningRef.current = false;
    onError?.("A geração demorou demais. Tente de novo pelo chat.");
  }, [onError, onProgress, onSuccess, planId]);

  useEffect(() => {
    if (!enabled || !planId) return;
    const key = `${planId}:${runToken}`;
    if (startedKeyRef.current === key) return;
    startedKeyRef.current = key;
    void run();
  }, [enabled, planId, run, runToken]);

  return null;
}
