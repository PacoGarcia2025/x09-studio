"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  resumeBuildAction,
  startBuildAction,
  tickBuildAction,
} from "@/lib/pipeline/builder.actions";

const MAX_STEPS = 250;
const MAX_IDLE_TICKS = 120;
const IDLE_DELAY_MS = 2_500;
const TICK_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isWaitingTick(message: string): boolean {
  return /Aguardando task em execução\/retry/i.test(message);
}

/**
 * Roda o Builder sem UI técnica — só callbacks de progresso.
 */
export function SilentBuildRunner({
  planId,
  enabled,
  freshStart = false,
  runToken = 0,
  onProgress,
  onPreviewUpdate,
  onSuccess,
  onError,
}: {
  planId: string | null;
  enabled: boolean;
  /** true = reinicia fila; false = retoma tasks pendentes (ex.: após F5). */
  freshStart?: boolean;
  /** Incrementa a cada novo "OK, construir" para permitir reexecução. */
  runToken?: number;
  onProgress?: (message: string) => void;
  onPreviewUpdate?: () => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}) {
  const runningRef = useRef(false);
  const startedKeyRef = useRef<string | null>(null);

  const run = useCallback(async () => {
    if (!planId || runningRef.current) return;
    runningRef.current = true;
    onProgress?.("Montando as páginas do seu app…");

    if (freshStart) {
      const start = await startBuildAction(planId);
      if (!start.ok) {
        runningRef.current = false;
        onError?.(start.error);
        return;
      }
    } else {
      const resume = await resumeBuildAction(planId);
      if (!resume.ok) {
        runningRef.current = false;
        onError?.(resume.error);
        return;
      }
      if (!resume.resumed) {
        runningRef.current = false;
        onSuccess?.();
        return;
      }
    }

    let steps = 0;
    let idleTicks = 0;

    while (steps < MAX_STEPS) {
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
          onPreviewUpdate?.();
          onSuccess?.();
        }
        return;
      }

      if (isWaitingTick(tick.message)) {
        idleTicks += 1;
        if (idleTicks >= MAX_IDLE_TICKS) {
          runningRef.current = false;
          onError?.(
            "A IA demorou mais que o esperado. Tente no chat: “continuar a geração” — o progresso salvo será retomado.",
          );
          return;
        }
        await sleep(IDLE_DELAY_MS);
        continue;
      }

      idleTicks = 0;
      steps += 1;

      if (tick.processed) {
        onPreviewUpdate?.();
      }

      await sleep(TICK_DELAY_MS);
    }

    runningRef.current = false;
    onError?.(
      "A geração demorou demais. Recarregue a página — o progresso salvo será retomado.",
    );
  }, [freshStart, onError, onPreviewUpdate, onProgress, onSuccess, planId]);

  useEffect(() => {
    if (!enabled || !planId) return;
    const key = `${planId}:${runToken}:${freshStart ? "fresh" : "resume"}`;
    if (startedKeyRef.current === key) return;
    startedKeyRef.current = key;
    void run();
  }, [enabled, freshStart, planId, run, runToken]);

  return null;
}
