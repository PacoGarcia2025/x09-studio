import type { SupabaseClient } from "@supabase/supabase-js";
import { applyFixesFromReportIssues } from "@/lib/pipeline/fix-apply.server";
import {
  buildFixInput,
  selectActionableIssues,
} from "@/lib/pipeline/fix-contract";
import {
  computeHealthScore,
  countReportIssues,
  createEmptyFixResult,
  isPreviewEligible,
  isVerifyClean,
  publicMessage,
  type FixAdvancedState,
  type FixPhase,
  type FixPublicState,
  type FixRunResult,
  type FixRunStatus,
  fixRunResultSchema,
} from "@/lib/pipeline/fix-schema";
import {
  createVerifyRun,
  getLatestVerifyReport,
  tickVerifyRun,
  type VerifyRow,
} from "@/lib/pipeline/verify.server";
import { verifyReportSchema, type VerifyReport } from "@/lib/pipeline/verify-schema";

export type FixRow = {
  id: string;
  project_id: string;
  plan_id: string | null;
  status: FixRunStatus;
  phase: FixPhase;
  max_attempts: number;
  attempt_count: number;
  health_score: number | null;
  success_rate: number | null;
  total_duration_ms: number | null;
  files_changed: string[];
  fixes_applied: number;
  fixes_failed: number;
  current_verify_report_id: string | null;
  result_json: FixRunResult;
  preview_ready: boolean;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
};

const SELECT_COLS =
  "id, project_id, plan_id, status, phase, max_attempts, attempt_count, health_score, success_rate, total_duration_ms, files_changed, fixes_applied, fixes_failed, current_verify_report_id, result_json, preview_ready, error_message, started_at, finished_at, created_at";

function parseResult(raw: unknown): FixRunResult {
  const parsed = fixRunResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`result_json inválido: ${parsed.error.message}`);
  }
  return parsed.data;
}

function parseReport(raw: unknown): VerifyReport {
  const parsed = verifyReportSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Verify report inválido para Fix");
  }
  return parsed.data;
}

function toRow(data: Record<string, unknown>): FixRow {
  return {
    id: data.id as string,
    project_id: data.project_id as string,
    plan_id: (data.plan_id as string | null) ?? null,
    status: data.status as FixRunStatus,
    phase: data.phase as FixPhase,
    max_attempts: data.max_attempts as number,
    attempt_count: data.attempt_count as number,
    health_score: data.health_score != null ? Number(data.health_score) : null,
    success_rate:
      data.success_rate != null ? Number(data.success_rate) : null,
    total_duration_ms: (data.total_duration_ms as number | null) ?? null,
    files_changed: (data.files_changed as string[]) ?? [],
    fixes_applied: data.fixes_applied as number,
    fixes_failed: data.fixes_failed as number,
    current_verify_report_id:
      (data.current_verify_report_id as string | null) ?? null,
    result_json: parseResult(data.result_json),
    preview_ready: Boolean(data.preview_ready),
    error_message: (data.error_message as string | null) ?? null,
    started_at: data.started_at as string,
    finished_at: (data.finished_at as string | null) ?? null,
    created_at: data.created_at as string,
  };
}

export function toPublicState(row: FixRow): FixPublicState {
  const running = row.status === "running";
  const verified =
    row.preview_ready ||
    row.status === "succeeded" ||
    (row.result_json.healthScore != null &&
      row.result_json.previewReady);
  return {
    fixRunId: row.id,
    status: row.status,
    phase: row.phase,
    running,
    message: publicMessage(row.phase, row.status),
    verified: Boolean(verified || row.status === "succeeded"),
    corrected: row.fixes_applied > 0 || row.status === "succeeded",
    healthScore: row.health_score,
    previewReady: row.preview_ready,
  };
}

export function toAdvancedState(row: FixRow): FixAdvancedState {
  const r = row.result_json;
  return {
    fixRunId: row.id,
    status: row.status,
    phase: row.phase,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    attempts: r.attempts,
    filesChanged: row.files_changed,
    fixesApplied: row.fixes_applied,
    fixesFailed: row.fixes_failed,
    successRate: row.success_rate,
    totalDurationMs: row.total_duration_ms,
    healthScore: row.health_score,
    lastApplied: r.lastApplied,
    currentVerifyReportId: row.current_verify_report_id,
    summary: r.summary,
    errorMessage: row.error_message,
  };
}

async function loadVerifyById(
  supabase: SupabaseClient,
  reportId: string,
): Promise<VerifyRow> {
  const { data, error } = await supabase
    .from("verify_reports")
    .select(
      "id, project_id, plan_id, status, report_json, summary, model, error_message, started_at, finished_at, created_at",
    )
    .eq("id", reportId)
    .maybeSingle();
  if (error || !data) {
    throw new Error(error?.message ?? "Verify report não encontrado");
  }
  return {
    ...data,
    status: data.status as VerifyRow["status"],
    report_json: parseReport(data.report_json),
  };
}

async function persistProjectGate(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    fixRunId: string;
    verifyReportId: string;
    healthScore: number;
    previewReady: boolean;
    projectStatus?: "ready" | "error";
  },
) {
  await supabase
    .from("projects")
    .update({
      preview_ready: input.previewReady,
      health_score: input.healthScore,
      last_verify_report_id: input.verifyReportId,
      last_fix_run_id: input.fixRunId,
      ...(input.projectStatus ? { status: input.projectStatus } : {}),
    })
    .eq("id", input.projectId);
}

function mergeFiles(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

function successRate(applied: number, failed: number): number {
  const total = applied + failed;
  if (total === 0) return 100;
  return Math.round((applied / total) * 1000) / 10;
}

export async function createFixRun(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    planId: string | null;
    verifyReportId: string;
    maxAttempts?: number;
  },
): Promise<FixRow> {
  const verify = await loadVerifyById(supabase, input.verifyReportId);
  if (verify.project_id !== input.projectId) {
    throw new Error("Verify report não pertence ao projeto");
  }
  if (verify.status === "running") {
    throw new Error("Aguarde o Verify terminar");
  }

  const report = verify.report_json;
  const health = computeHealthScore(report);

  // Já limpo → marca preview e fecha sem loop
  if (isVerifyClean(report) && isPreviewEligible(report)) {
    const result = createEmptyFixResult({
      maxAttempts: input.maxAttempts,
      verifyReportId: verify.id,
    });
    result.phase = "done";
    result.status = "succeeded";
    result.healthScore = health;
    result.successRate = 100;
    result.totalDurationMs = 0;
    result.previewReady = true;
    result.summary = "Projeto já estava saudável — sem correções necessárias";
    result.attemptCount = 0;

    const finishedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("fix_runs")
      .insert({
        project_id: input.projectId,
        plan_id: input.planId,
        status: "succeeded",
        phase: "done",
        max_attempts: result.maxAttempts,
        attempt_count: 0,
        health_score: health,
        success_rate: 100,
        total_duration_ms: 0,
        files_changed: [],
        fixes_applied: 0,
        fixes_failed: 0,
        current_verify_report_id: verify.id,
        result_json: result,
        preview_ready: true,
        started_at: finishedAt,
        finished_at: finishedAt,
      })
      .select(SELECT_COLS)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Falha ao criar fix_run");
    }

    const row = toRow(data);
    await persistProjectGate(supabase, {
      projectId: input.projectId,
      fixRunId: row.id,
      verifyReportId: verify.id,
      healthScore: health,
      previewReady: true,
      projectStatus: "ready",
    });
    return row;
  }

  const result = createEmptyFixResult({
    maxAttempts: input.maxAttempts,
    verifyReportId: verify.id,
  });

  const { data, error } = await supabase
    .from("fix_runs")
    .insert({
      project_id: input.projectId,
      plan_id: input.planId,
      status: "running",
      phase: "fixing",
      max_attempts: result.maxAttempts,
      attempt_count: 0,
      health_score: health,
      current_verify_report_id: verify.id,
      result_json: result,
      preview_ready: false,
    })
    .select(SELECT_COLS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao criar fix_run");
  }

  return toRow(data);
}

async function updateFixRow(
  supabase: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<FixRow> {
  const { data, error } = await supabase
    .from("fix_runs")
    .update(patch)
    .eq("id", id)
    .select(SELECT_COLS)
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao atualizar fix_run");
  }
  return toRow(data);
}

async function finalizeFixRun(
  supabase: SupabaseClient,
  row: FixRow,
  result: FixRunResult,
  status: FixRunStatus,
  verifyReportId: string,
  health: number,
  previewReady: boolean,
  errorMessage?: string | null,
): Promise<FixRow> {
  const finishedAt = new Date().toISOString();
  const duration = Math.max(
    0,
    new Date(finishedAt).getTime() - new Date(row.started_at).getTime(),
  );
  result.phase = "done";
  result.status = status;
  result.healthScore = health;
  result.successRate = successRate(result.fixesApplied, result.fixesFailed);
  result.totalDurationMs = duration;
  result.previewReady = previewReady;
  result.summary = publicMessage("done", status);
  result.currentVerifyReportId = verifyReportId;

  const updated = await updateFixRow(supabase, row.id, {
    status,
    phase: "done",
    attempt_count: result.attemptCount,
    health_score: health,
    success_rate: result.successRate,
    total_duration_ms: duration,
    files_changed: result.filesChanged,
    fixes_applied: result.fixesApplied,
    fixes_failed: result.fixesFailed,
    current_verify_report_id: verifyReportId,
    result_json: result,
    preview_ready: previewReady,
    error_message: errorMessage ?? null,
    finished_at: finishedAt,
  });

  await persistProjectGate(supabase, {
    projectId: row.project_id,
    fixRunId: row.id,
    verifyReportId,
    healthScore: health,
    previewReady,
    projectStatus: previewReady
      ? "ready"
      : status === "failed" || status === "exhausted"
        ? "error"
        : "ready",
  });

  return updated;
}

/**
 * Tick do loop Fix → Verify → Fix…
 * Consome exclusivamente o Verify Report (nunca analisa o projeto).
 */
export async function tickFixRun(
  supabase: SupabaseClient,
  fixRunId: string,
): Promise<{
  done: boolean;
  row: FixRow;
  public: FixPublicState;
  advanced: FixAdvancedState;
}> {
  const { data, error } = await supabase
    .from("fix_runs")
    .select(SELECT_COLS)
    .eq("id", fixRunId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Fix run não encontrado");
  }

  let row = toRow(data);
  if (row.status !== "running") {
    return {
      done: true,
      row,
      public: toPublicState(row),
      advanced: toAdvancedState(row),
    };
  }

  const result = row.result_json;

  // ——— PHASE: verifying ———
  if (row.phase === "verifying") {
    if (!row.current_verify_report_id) {
      throw new Error("Verify report ausente na fase verifying");
    }

    const tick = await tickVerifyRun(supabase, row.current_verify_report_id);
    if (!tick.done) {
      result.summary = "✨ Corrigindo automaticamente...";
      row = await updateFixRow(supabase, row.id, {
        result_json: result,
        current_verify_report_id: tick.row.id,
      });
      return {
        done: false,
        row,
        public: toPublicState(row),
        advanced: toAdvancedState(row),
      };
    }

    const report = tick.report;
    const health = computeHealthScore(report);
    const counts = countReportIssues(report);

    if (result.openAttempt) {
      const closed = {
        ...result.openAttempt,
        verifyReportIdAfter: tick.row.id,
        errorsAfter: counts.errors,
        warningsAfter: counts.warnings,
        healthAfter: health,
        finishedAt: new Date().toISOString(),
      };
      result.attempts = [...result.attempts, closed];
      result.openAttempt = null;
    }

    result.healthScore = health;
    result.currentVerifyReportId = tick.row.id;

    if (isVerifyClean(report)) {
      const previewReady = isPreviewEligible(report);
      row = await finalizeFixRun(
        supabase,
        row,
        result,
        "succeeded",
        tick.row.id,
        health,
        previewReady,
      );
      return {
        done: true,
        row,
        public: toPublicState(row),
        advanced: toAdvancedState(row),
      };
    }

    if (result.attemptCount >= result.maxAttempts) {
      row = await finalizeFixRun(
        supabase,
        row,
        result,
        "exhausted",
        tick.row.id,
        health,
        false,
        "Limite máximo de tentativas atingido",
      );
      return {
        done: true,
        row,
        public: toPublicState(row),
        advanced: toAdvancedState(row),
      };
    }

    // Ainda há erros → nova rodada de Fix
    result.phase = "fixing";
    result.summary = "✨ Corrigindo automaticamente...";
    row = await updateFixRow(supabase, row.id, {
      phase: "fixing",
      health_score: health,
      current_verify_report_id: tick.row.id,
      result_json: result,
    });
    return {
      done: false,
      row,
      public: toPublicState(row),
      advanced: toAdvancedState(row),
    };
  }

  // ——— PHASE: fixing ———
  if (!row.current_verify_report_id) {
    throw new Error("Sem Verify Report para consumir");
  }

  const verify = await loadVerifyById(supabase, row.current_verify_report_id);
  const report = verify.report_json;

  // Segurança: Fix nunca "analisa" — só usa o report
  const fixInput = buildFixInput({
    reportId: verify.id,
    report,
  });
  const actionable = selectActionableIssues(fixInput.report).filter(
    (i) => i.severity === "error" || i.confidence >= 0.7,
  );

  const before = countReportIssues(report);
  const healthBefore = computeHealthScore(report);

  if (actionable.length === 0) {
    // Sem ações possíveis mas ainda há erros → exhausted/partial
    const status: FixRunStatus =
      before.errors > 0 ? "exhausted" : "partial";
    row = await finalizeFixRun(
      supabase,
      row,
      result,
      status,
      verify.id,
      healthBefore,
      isPreviewEligible(report),
      before.errors > 0
        ? "Sem correções acionáveis no Verify Report"
        : null,
    );
    return {
      done: true,
      row,
      public: toPublicState(row),
      advanced: toAdvancedState(row),
    };
  }

  const attemptNumber = result.attemptCount + 1;
  const apply = await applyFixesFromReportIssues(
    row.project_id,
    actionable,
    { maxFixes: 8 },
  );

  result.attemptCount = attemptNumber;
  result.fixesApplied += apply.fixesApplied;
  result.fixesFailed += apply.fixesFailed;
  result.filesChanged = mergeFiles(result.filesChanged, apply.filesChanged);
  result.lastApplied = apply.applied;
  result.openAttempt = {
    attempt: attemptNumber,
    verifyReportId: verify.id,
    errorsBefore: before.errors,
    warningsBefore: before.warnings,
    healthBefore,
    fixesAttempted: apply.applied.length,
    fixesApplied: apply.fixesApplied,
    fixesFailed: apply.fixesFailed,
    filesChanged: apply.filesChanged,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    notes: apply.applied.map((a) => `${a.ok ? "ok" : "fail"}: ${a.message}`),
  };

  // Re-Verify obrigatório após Fix
  const newVerify = await createVerifyRun(supabase, {
    projectId: row.project_id,
    planId: row.plan_id,
  });

  result.phase = "verifying";
  result.currentVerifyReportId = newVerify.id;
  result.summary = "✨ Corrigindo automaticamente...";

  row = await updateFixRow(supabase, row.id, {
    phase: "verifying",
    attempt_count: attemptNumber,
    files_changed: result.filesChanged,
    fixes_applied: result.fixesApplied,
    fixes_failed: result.fixesFailed,
    current_verify_report_id: newVerify.id,
    result_json: result,
  });

  return {
    done: false,
    row,
    public: toPublicState(row),
    advanced: toAdvancedState(row),
  };
}

export async function getLatestFixRun(
  supabase: SupabaseClient,
  projectId: string,
  planId?: string | null,
): Promise<FixRow | null> {
  let q = supabase
    .from("fix_runs")
    .select(SELECT_COLS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (planId) q = q.eq("plan_id", planId);

  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  return toRow(data);
}

/** Atalho: se o último verify já está limpo, marca preview sem Fix. */
export async function markPreviewFromCleanVerify(
  supabase: SupabaseClient,
  projectId: string,
  planId: string | null,
): Promise<FixRow | null> {
  const latest = await getLatestVerifyReport(supabase, projectId, planId);
  if (!latest || latest.status === "running") return null;
  if (!isVerifyClean(latest.report_json)) return null;
  if (!isPreviewEligible(latest.report_json)) return null;

  return createFixRun(supabase, {
    projectId,
    planId,
    verifyReportId: latest.id,
  });
}
