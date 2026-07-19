"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { generatePlanAction } from "@/lib/pipeline/actions";
import type { StudioPlan } from "@/lib/pipeline/plan-schema";

/**
 * Quando o usuário chega do dashboard com autostart,
 * gera o plano no editor (não em /projects/new).
 */
export function AutoPlanBootstrap({
  projectId,
  prompt,
  enabled,
  hasPlan,
  onStarted,
  onReady,
  onError,
}: {
  projectId: string;
  prompt: string;
  enabled: boolean;
  hasPlan: boolean;
  onStarted?: () => void;
  onReady?: (plan: {
    planId: string;
    plan: StudioPlan;
    model: string;
  }) => void;
  onError?: (message: string) => void;
}) {
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasPlan || !prompt.trim() || startedRef.current) return;
    startedRef.current = true;
    onStarted?.();

    void (async () => {
      const result = await generatePlanAction(projectId, prompt);
      if (!result.ok) {
        onError?.(result.error);
        return;
      }
      onReady?.({
        planId: result.planId,
        plan: result.plan,
        model: result.model,
      });
      router.refresh();
    })();
  }, [enabled, hasPlan, onError, onReady, onStarted, projectId, prompt, router]);

  return null;
}
