"use server";

import { revalidatePath } from "next/cache";
import {
  createFixRun,
  getLatestFixRun,
  tickFixRun,
  toAdvancedState,
  toPublicState,
  type FixRow,
} from "@/lib/pipeline/fix.server";
import type {
  FixAdvancedState,
  FixPublicState,
} from "@/lib/pipeline/fix-schema";
import { DEFAULT_MAX_FIX_ATTEMPTS } from "@/lib/pipeline/fix-schema";
import { assertProjectPreviewReady } from "@/lib/pipeline/preview-gate";
import { getLatestVerifyReport } from "@/lib/pipeline/verify.server";
import { createClient } from "@/lib/supabase/server";

async function assertPlanOwner(planId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" as const };

  const { data: plan } = await supabase
    .from("plans")
    .select("id, project_id, status")
    .eq("id", planId)
    .maybeSingle();

  if (!plan) return { error: "Plano não encontrado" as const };

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, workspace_id")
    .eq("id", plan.project_id)
    .maybeSingle();

  if (!project) return { error: "Projeto não encontrado" as const };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", project.workspace_id)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) {
    return { error: "Sem permissão" as const };
  }

  return { supabase, plan, project, error: null };
}

async function assertProjectOwner(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" as const };

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { error: "Projeto não encontrado" as const };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", project.workspace_id)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) {
    return { error: "Sem permissão" as const };
  }

  return { supabase, project, error: null };
}

async function assertFixRunOwner(fixRunId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" as const };

  const { data: run } = await supabase
    .from("fix_runs")
    .select("id, project_id")
    .eq("id", fixRunId)
    .maybeSingle();

  if (!run) return { error: "Fix run não encontrado" as const };

  const gate = await assertProjectOwner(run.project_id);
  if (gate.error) return { error: gate.error };

  return { supabase: gate.supabase!, project: gate.project!, run, error: null };
}

export type FixStatePayload = {
  public: FixPublicState;
  advanced: FixAdvancedState;
};

function payloadFromRow(row: FixRow): FixStatePayload {
  return {
    public: toPublicState(row),
    advanced: toAdvancedState(row),
  };
}

export async function getFixState(
  projectId: string,
  planId?: string | null,
): Promise<
  { ok: true; data: FixStatePayload | null } | { ok: false; error: string }
> {
  const gate = await assertProjectOwner(projectId);
  if (gate.error || !gate.supabase) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  try {
    const row = await getLatestFixRun(gate.supabase, projectId, planId ?? null);
    return { ok: true, data: row ? payloadFromRow(row) : null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao carregar Fix",
    };
  }
}

/**
 * Inicia Auto Fix a partir do Verify Report mais recente do plano.
 */
export async function startAutoFixAction(
  planId: string,
  options?: { maxAttempts?: number; verifyReportId?: string },
): Promise<
  | { ok: true; fixRunId: string; data: FixStatePayload }
  | { ok: false; error: string }
> {
  const gate = await assertPlanOwner(planId);
  if (gate.error || !gate.supabase || !gate.plan || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  try {
    let verifyReportId = options?.verifyReportId;
    if (!verifyReportId) {
      const latest = await getLatestVerifyReport(
        gate.supabase,
        gate.project.id,
        gate.plan.id,
      );
      if (!latest || latest.status === "running") {
        return {
          ok: false,
          error: "Execute o Verify e aguarde o relatório antes do Fix.",
        };
      }
      verifyReportId = latest.id;
    }

    const row = await createFixRun(gate.supabase, {
      projectId: gate.project.id,
      planId: gate.plan.id,
      verifyReportId,
      maxAttempts: options?.maxAttempts ?? DEFAULT_MAX_FIX_ATTEMPTS,
    });

    revalidatePath(`/projects/${gate.project.id}`);
    return { ok: true, fixRunId: row.id, data: payloadFromRow(row) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao iniciar Auto Fix",
    };
  }
}

export async function tickAutoFixAction(fixRunId: string): Promise<
  | {
      ok: true;
      done: boolean;
      data: FixStatePayload;
    }
  | { ok: false; error: string }
> {
  const gate = await assertFixRunOwner(fixRunId);
  if (gate.error || !gate.supabase || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  try {
    const tick = await tickFixRun(gate.supabase, fixRunId);
    if (tick.done) {
      revalidatePath(`/projects/${gate.project.id}`);
    }
    return {
      ok: true,
      done: tick.done,
      data: {
        public: tick.public,
        advanced: tick.advanced,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha no tick do Auto Fix",
    };
  }
}

/** Gate Preview (Sprint 7) — action pronta para consumo. */
export async function checkPreviewReadyAction(projectId: string) {
  const gate = await assertProjectOwner(projectId);
  if (gate.error || !gate.supabase) {
    return { ok: false as const, error: gate.error ?? "Erro" };
  }
  const result = await assertProjectPreviewReady(gate.supabase, projectId);
  return { ok: true as const, data: result };
}
