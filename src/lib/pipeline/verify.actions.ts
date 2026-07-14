"use server";

import { revalidatePath } from "next/cache";
import { buildFixInput, type FixInput } from "@/lib/pipeline/fix-contract";
import {
  createVerifyRun,
  getLatestVerifyReport,
  tickVerifyRun,
  type VerifyRow,
} from "@/lib/pipeline/verify.server";
import type { VerifyReport } from "@/lib/pipeline/verify-schema";
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

async function assertReportOwner(reportId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" as const };

  const { data: report } = await supabase
    .from("verify_reports")
    .select("id, project_id, plan_id, status")
    .eq("id", reportId)
    .maybeSingle();

  if (!report) return { error: "Relatório não encontrado" as const };

  const gate = await assertProjectOwner(report.project_id);
  if (gate.error) return { error: gate.error };

  return { supabase: gate.supabase!, project: gate.project!, report, error: null };
}

export type VerifyState = {
  reportId: string;
  status: string;
  summary: string | null;
  model: string | null;
  report: VerifyReport;
  startedAt: string;
  finishedAt: string | null;
};

function toState(row: VerifyRow): VerifyState {
  return {
    reportId: row.id,
    status: row.status,
    summary: row.summary,
    model: row.model,
    report: row.report_json,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export async function getVerifyState(
  projectId: string,
  planId?: string | null,
): Promise<{ ok: true; data: VerifyState | null } | { ok: false; error: string }> {
  const gate = await assertProjectOwner(projectId);
  if (gate.error || !gate.supabase) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  try {
    const row = await getLatestVerifyReport(
      gate.supabase,
      projectId,
      planId ?? null,
    );
    return { ok: true, data: row ? toState(row) : null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao carregar Verify",
    };
  }
}

export async function startVerifyAction(
  planId: string,
): Promise<
  | { ok: true; reportId: string }
  | { ok: false; error: string }
> {
  const gate = await assertPlanOwner(planId);
  if (gate.error || !gate.supabase || !gate.plan || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  if (gate.plan.status === "building") {
    return { ok: false, error: "Aguarde o Builder terminar antes do Verify." };
  }

  try {
    const row = await createVerifyRun(gate.supabase, {
      projectId: gate.project.id,
      planId: gate.plan.id,
    });
    revalidatePath(`/projects/${gate.project.id}`);
    return { ok: true, reportId: row.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao iniciar Verify",
    };
  }
}

export async function tickVerifyAction(reportId: string): Promise<
  | {
      ok: true;
      done: boolean;
      currentCategory: string | null;
      data: VerifyState;
    }
  | { ok: false; error: string }
> {
  const gate = await assertReportOwner(reportId);
  if (gate.error || !gate.supabase || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  try {
    const tick = await tickVerifyRun(gate.supabase, reportId);
    if (tick.done) {
      revalidatePath(`/projects/${gate.project.id}`);
    }
    return {
      ok: true,
      done: tick.done,
      currentCategory: tick.currentCategory,
      data: toState(tick.row),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha no tick do Verify",
    };
  }
}

/**
 * Entrada tipada para o Fix Engine (Sprint 6).
 * Não aplica correções — apenas expõe o contrato.
 */
export async function getFixInputAction(
  projectId: string,
  planId?: string | null,
): Promise<{ ok: true; data: FixInput | null } | { ok: false; error: string }> {
  const gate = await assertProjectOwner(projectId);
  if (gate.error || !gate.supabase) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  const row = await getLatestVerifyReport(
    gate.supabase,
    projectId,
    planId ?? null,
  );
  if (!row || row.status === "running") {
    return { ok: true, data: null };
  }

  return {
    ok: true,
    data: buildFixInput({ reportId: row.id, report: row.report_json }),
  };
}
