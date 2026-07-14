import type { SupabaseClient } from "@supabase/supabase-js";
import { enrichVerifyReportWithAi } from "@/lib/pipeline/verify-analyze.server";
import { runVerifyCategory } from "@/lib/pipeline/verify-checks.server";
import {
  VERIFY_CATEGORY_ORDER,
  createEmptyVerifyReport,
  deriveOverallStatus,
  verifyReportSchema,
  type VerifyCategoryId,
  type VerifyReport,
  type VerifyReportStatus,
} from "@/lib/pipeline/verify-schema";

export type VerifyRow = {
  id: string;
  project_id: string;
  plan_id: string | null;
  status: VerifyReportStatus;
  report_json: VerifyReport;
  summary: string | null;
  model: string | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
};

function parseReport(raw: unknown): VerifyReport {
  const parsed = verifyReportSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`report_json inválido: ${parsed.error.message}`);
  }
  return parsed.data;
}

export async function createVerifyRun(
  supabase: SupabaseClient,
  input: { projectId: string; planId: string | null },
): Promise<VerifyRow> {
  const report = createEmptyVerifyReport({
    projectId: input.projectId,
    planId: input.planId,
  });

  const { data, error } = await supabase
    .from("verify_reports")
    .insert({
      project_id: input.projectId,
      plan_id: input.planId,
      status: "running",
      report_json: report,
      summary: report.summary,
      started_at: report.meta.startedAt,
    })
    .select(
      "id, project_id, plan_id, status, report_json, summary, model, error_message, started_at, finished_at, created_at",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao criar verify_report");
  }

  return {
    ...data,
    status: data.status as VerifyReportStatus,
    report_json: parseReport(data.report_json),
  };
}

function nextPendingCategory(report: VerifyReport): VerifyCategoryId | null {
  for (const cat of VERIFY_CATEGORY_ORDER) {
    if (report.categories[cat].status === "pending") return cat;
  }
  return null;
}

async function finalizeVerifyRun(
  supabase: SupabaseClient,
  reportId: string,
  report: VerifyReport,
): Promise<{ report: VerifyReport; row: VerifyRow }> {
  const overall = deriveOverallStatus(report.categories, report.issues);
  let next: VerifyReport = {
    ...report,
    status: overall,
    nextCategory: null,
    summary:
      report.summary ||
      (overall === "passed"
        ? "Todos os checks passaram."
        : overall === "warning"
          ? "Verify concluiu com avisos."
          : "Verify concluiu com falhas."),
    meta: {
      ...report.meta,
      finishedAt: new Date().toISOString(),
    },
  };

  const enriched = await enrichVerifyReportWithAi(next);
  next = enriched.report;
  const finishedAt = new Date().toISOString();
  next = {
    ...next,
    meta: { ...next.meta, finishedAt },
  };

  const { data: updated, error: upErr } = await supabase
    .from("verify_reports")
    .update({
      status: next.status,
      report_json: next,
      summary: next.summary,
      model: enriched.model,
      finished_at: finishedAt,
    })
    .eq("id", reportId)
    .select(
      "id, project_id, plan_id, status, report_json, summary, model, error_message, started_at, finished_at, created_at",
    )
    .single();

  if (upErr || !updated) {
    throw new Error(upErr?.message ?? "Falha ao finalizar verify");
  }

  return {
    report: next,
    row: {
      ...updated,
      status: updated.status as VerifyReportStatus,
      report_json: next,
    },
  };
}

/**
 * Executa o próximo check pendente.
 * Quando a fila termina, enriquece com IA e fecha o relatório.
 */
export async function tickVerifyRun(
  supabase: SupabaseClient,
  reportId: string,
): Promise<{
  done: boolean;
  report: VerifyReport;
  row: VerifyRow;
  currentCategory: VerifyCategoryId | null;
}> {
  const { data: row, error } = await supabase
    .from("verify_reports")
    .select(
      "id, project_id, plan_id, status, report_json, summary, model, error_message, started_at, finished_at, created_at",
    )
    .eq("id", reportId)
    .maybeSingle();

  if (error || !row) {
    throw new Error(error?.message ?? "Verify report não encontrado");
  }

  let report = parseReport(row.report_json);

  if (row.status !== "running") {
    return {
      done: true,
      report,
      row: {
        ...row,
        status: row.status as VerifyReportStatus,
        report_json: report,
      },
      currentCategory: null,
    };
  }

  const category = nextPendingCategory(report);
  if (!category) {
    const finalized = await finalizeVerifyRun(supabase, reportId, report);
    return {
      done: true,
      report: finalized.report,
      row: finalized.row,
      currentCategory: null,
    };
  }

  // Mark running
  report = {
    ...report,
    nextCategory: category,
    categories: {
      ...report.categories,
      [category]: {
        ...report.categories[category],
        status: "running",
        startedAt: new Date().toISOString(),
      },
    },
  };

  await supabase
    .from("verify_reports")
    .update({ report_json: report, summary: `Verificando ${category}…` })
    .eq("id", reportId);

  try {
    const outcome = await runVerifyCategory(row.project_id, category);
    const finishedAt = new Date().toISOString();
    report = {
      ...report,
      issues: [...report.issues, ...outcome.issues],
      toolTraces: [...report.toolTraces, ...outcome.traces],
      categories: {
        ...report.categories,
        [category]: {
          status: outcome.status,
          summary: outcome.summary,
          startedAt: report.categories[category].startedAt,
          finishedAt,
        },
      },
      nextCategory: nextPendingCategory({
        ...report,
        categories: {
          ...report.categories,
          [category]: { status: outcome.status, summary: outcome.summary },
        },
      }),
      summary: outcome.summary,
    };

    report = {
      ...report,
      nextCategory: nextPendingCategory(report),
    };

    if (report.nextCategory === null) {
      const finalized = await finalizeVerifyRun(supabase, reportId, report);
      return {
        done: true,
        report: finalized.report,
        row: finalized.row,
        currentCategory: category,
      };
    }

    const { data: updated, error: upErr } = await supabase
      .from("verify_reports")
      .update({
        report_json: report,
        summary: report.summary,
      })
      .eq("id", reportId)
      .select(
        "id, project_id, plan_id, status, report_json, summary, model, error_message, started_at, finished_at, created_at",
      )
      .single();

    if (upErr || !updated) {
      throw new Error(upErr?.message ?? "Falha ao atualizar verify");
    }

    return {
      done: false,
      report,
      row: {
        ...updated,
        status: "running",
        report_json: report,
      },
      currentCategory: category,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro no Verify";
    const finishedAt = new Date().toISOString();
    report = {
      ...report,
      status: "error",
      nextCategory: null,
      summary: message,
      categories: {
        ...report.categories,
        [category]: {
          status: "failed",
          summary: message,
          finishedAt,
        },
      },
      meta: { ...report.meta, finishedAt },
    };

    const { data: updated } = await supabase
      .from("verify_reports")
      .update({
        status: "error",
        report_json: report,
        summary: message,
        error_message: message.slice(0, 2000),
        finished_at: finishedAt,
      })
      .eq("id", reportId)
      .select(
        "id, project_id, plan_id, status, report_json, summary, model, error_message, started_at, finished_at, created_at",
      )
      .single();

    return {
      done: true,
      report,
      row: updated
        ? {
            ...updated,
            status: "error",
            report_json: report,
          }
        : {
            ...row,
            status: "error",
            report_json: report,
            summary: message,
            error_message: message,
            finished_at: finishedAt,
          },
      currentCategory: category,
    };
  }
}

export async function getLatestVerifyReport(
  supabase: SupabaseClient,
  projectId: string,
  planId?: string | null,
): Promise<VerifyRow | null> {
  let q = supabase
    .from("verify_reports")
    .select(
      "id, project_id, plan_id, status, report_json, summary, model, error_message, started_at, finished_at, created_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (planId) {
    q = q.eq("plan_id", planId);
  }

  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;

  return {
    ...data,
    status: data.status as VerifyReportStatus,
    report_json: parseReport(data.report_json),
  };
}
