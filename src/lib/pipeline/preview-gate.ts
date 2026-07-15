/**
 * Preview Gate (Sprint 7) — só abre projetos aprovados pelo Verify/Fix.
 *
 * Critérios:
 * - projects.preview_ready = true
 * - health_score >= PREVIEW_MIN_HEALTH_SCORE
 * - último verify sem erros (garantido ao setar preview_ready)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PREVIEW_MIN_HEALTH_SCORE } from "@/lib/pipeline/fix-schema";

export type PreviewGateResult =
  | {
      ok: true;
      projectId: string;
      healthScore: number;
      lastVerifyReportId: string | null;
      lastFixRunId: string | null;
    }
  | {
      ok: false;
      reason:
        | "not_found"
        | "not_ready"
        | "low_health"
        | "missing_verify";
      message: string;
    };

export async function assertProjectPreviewReady(
  supabase: SupabaseClient,
  projectId: string,
): Promise<PreviewGateResult> {
  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, preview_ready, health_score, last_verify_report_id, last_fix_run_id",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    return {
      ok: false,
      reason: "not_found",
      message: "Projeto não encontrado",
    };
  }

  if (!project.preview_ready) {
    return {
      ok: false,
      reason: "not_ready",
      message:
        "Preview disponível apenas após Verify/Fix aprovarem o projeto.",
    };
  }

  const health = Number(project.health_score ?? 0);
  if (health < PREVIEW_MIN_HEALTH_SCORE) {
    return {
      ok: false,
      reason: "low_health",
      message: `Health Score insuficiente (${health}). Mínimo: ${PREVIEW_MIN_HEALTH_SCORE}.`,
    };
  }

  if (!project.last_verify_report_id) {
    return {
      ok: false,
      reason: "missing_verify",
      message: "Sem Verify Report aprovado para Preview.",
    };
  }

  return {
    ok: true,
    projectId: project.id,
    healthScore: health,
    lastVerifyReportId: project.last_verify_report_id,
    lastFixRunId: project.last_fix_run_id,
  };
}
