import { z } from "zod";
import type { VerifyReport } from "@/lib/pipeline/verify-schema";

export const DEFAULT_MAX_FIX_ATTEMPTS = 3;

/** Preview (Sprint 7) só abre projetos com este limiar e 0 erros. */
export const PREVIEW_MIN_HEALTH_SCORE = 80;

export const fixRunStatusSchema = z.enum([
  "running",
  "succeeded",
  "partial",
  "failed",
  "exhausted",
]);
export type FixRunStatus = z.infer<typeof fixRunStatusSchema>;

export const fixPhaseSchema = z.enum(["fixing", "verifying", "done"]);
export type FixPhase = z.infer<typeof fixPhaseSchema>;

export const fixAttemptSchema = z.object({
  attempt: z.number().int().positive(),
  verifyReportId: z.string().uuid(),
  errorsBefore: z.number().int().nonnegative(),
  warningsBefore: z.number().int().nonnegative(),
  healthBefore: z.number().min(0).max(100),
  fixesAttempted: z.number().int().nonnegative(),
  fixesApplied: z.number().int().nonnegative(),
  fixesFailed: z.number().int().nonnegative(),
  filesChanged: z.array(z.string()),
  verifyReportIdAfter: z.string().uuid().nullable().optional(),
  errorsAfter: z.number().int().nonnegative().nullable().optional(),
  warningsAfter: z.number().int().nonnegative().nullable().optional(),
  healthAfter: z.number().min(0).max(100).nullable().optional(),
  startedAt: z.string(),
  finishedAt: z.string().nullable().optional(),
  notes: z.array(z.string()).default([]),
});

export type FixAttempt = z.infer<typeof fixAttemptSchema>;

export const fixAppliedItemSchema = z.object({
  issueId: z.string(),
  kind: z.string(),
  path: z.string().nullable().optional(),
  ok: z.boolean(),
  message: z.string(),
});

export type FixAppliedItem = z.infer<typeof fixAppliedItemSchema>;

/** Estado interno completo do Fix Run (result_json). */
export const fixRunResultSchema = z.object({
  version: z.literal(1),
  phase: fixPhaseSchema,
  status: fixRunStatusSchema,
  maxAttempts: z.number().int().positive(),
  attemptCount: z.number().int().nonnegative(),
  attempts: z.array(fixAttemptSchema),
  /** Tentativa em andamento (antes do re-verify fechar). */
  openAttempt: fixAttemptSchema.nullable().optional(),
  lastApplied: z.array(fixAppliedItemSchema).default([]),
  filesChanged: z.array(z.string()),
  fixesApplied: z.number().int().nonnegative(),
  fixesFailed: z.number().int().nonnegative(),
  healthScore: z.number().min(0).max(100).nullable(),
  successRate: z.number().min(0).max(100).nullable(),
  totalDurationMs: z.number().int().nonnegative().nullable(),
  previewReady: z.boolean(),
  summary: z.string(),
  currentVerifyReportId: z.string().uuid().nullable(),
});

export type FixRunResult = z.infer<typeof fixRunResultSchema>;

/** Vista pública — sem detalhes técnicos. */
export type FixPublicState = {
  fixRunId: string;
  status: FixRunStatus;
  phase: FixPhase;
  running: boolean;
  /** Mensagem amigável única. */
  message: string;
  verified: boolean;
  corrected: boolean;
  healthScore: number | null;
  previewReady: boolean;
};

/** Painel avançado. */
export type FixAdvancedState = {
  fixRunId: string;
  status: FixRunStatus;
  phase: FixPhase;
  attemptCount: number;
  maxAttempts: number;
  attempts: FixAttempt[];
  filesChanged: string[];
  fixesApplied: number;
  fixesFailed: number;
  successRate: number | null;
  totalDurationMs: number | null;
  healthScore: number | null;
  lastApplied: FixAppliedItem[];
  currentVerifyReportId: string | null;
  summary: string;
  errorMessage: string | null;
};

export function countReportIssues(report: VerifyReport): {
  errors: number;
  warnings: number;
} {
  return {
    errors: report.issues.filter((i) => i.severity === "error").length,
    warnings: report.issues.filter((i) => i.severity === "warning").length,
  };
}

/**
 * Health Score 0–100 a partir do Verify Report (único input).
 * Não inspeciona o disco.
 */
export function computeHealthScore(report: VerifyReport): number {
  const cats = Object.values(report.categories);
  const catAvg =
    cats.length === 0
      ? 50
      : cats.reduce((acc, c) => {
          if (c.status === "success") return acc + 100;
          if (c.status === "warning") return acc + 72;
          if (c.status === "failed") return acc + 25;
          if (c.status === "running") return acc + 40;
          return acc + 50;
        }, 0) / cats.length;

  const { errors, warnings } = countReportIssues(report);
  const penalty = Math.min(70, errors * 14 + warnings * 4);
  const statusBoost =
    report.status === "passed" ? 5 : report.status === "warning" ? 0 : -5;

  return Math.round(
    Math.max(0, Math.min(100, catAvg - penalty + statusBoost)),
  );
}

export function isVerifyClean(report: VerifyReport): boolean {
  return countReportIssues(report).errors === 0;
}

export function isPreviewEligible(report: VerifyReport): boolean {
  return (
    isVerifyClean(report) &&
    computeHealthScore(report) >= PREVIEW_MIN_HEALTH_SCORE &&
    (report.status === "passed" || report.status === "warning")
  );
}

export function createEmptyFixResult(input: {
  maxAttempts?: number;
  verifyReportId: string | null;
}): FixRunResult {
  return {
    version: 1,
    phase: "fixing",
    status: "running",
    maxAttempts: input.maxAttempts ?? DEFAULT_MAX_FIX_ATTEMPTS,
    attemptCount: 0,
    attempts: [],
    openAttempt: null,
    lastApplied: [],
    filesChanged: [],
    fixesApplied: 0,
    fixesFailed: 0,
    healthScore: null,
    successRate: null,
    totalDurationMs: null,
    previewReady: false,
    summary: "Corrigindo automaticamente…",
    currentVerifyReportId: input.verifyReportId,
  };
}

export function publicMessage(phase: FixPhase, status: FixRunStatus): string {
  if (status === "running") {
    return "✨ Corrigindo automaticamente...";
  }
  if (status === "succeeded") {
    return "✔ Projeto verificado e corrigido";
  }
  if (status === "partial") {
    return "✔ Correção parcial concluída";
  }
  if (status === "exhausted") {
    return "Correção automática atingiu o limite de tentativas";
  }
  return "Não foi possível corrigir automaticamente";
}
