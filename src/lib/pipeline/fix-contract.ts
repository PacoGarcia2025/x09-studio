/**
 * Contrato Fix Engine (Sprint 6).
 *
 * O Fix NÃO re-descobre erros via IA nem analisa o projeto.
 * Consome exclusivamente o VerifyReport e atua sobre `issues` com `fixTarget`.
 *
 * Fluxo:
 *   Builder → Verify → Fix(report) → Verify → (Fix…) até 0 erros ou max attempts
 * Preview (Sprint 7) usa projects.preview_ready via preview-gate.ts
 */

import type {
  VerifyFixTarget,
  VerifyIssue,
  VerifyReport,
  VerifyReportStatus,
} from "@/lib/pipeline/verify-schema";
import { isVerifyClean } from "@/lib/pipeline/fix-schema";

export type FixInput = {
  projectId: string;
  planId: string | null;
  reportId: string;
  report: VerifyReport;
  /** Issues elegíveis para correção automática (errors + warnings com fixTarget). */
  actionableIssues: VerifyIssue[];
};

export type FixActionDraft = {
  issueId: string;
  target: VerifyFixTarget;
  /** Prioridade: errors primeiro, depois por confiança. */
  priority: number;
};

/** Filtra issues que o Fix poderá tentar corrigir. */
export function selectActionableIssues(report: VerifyReport): VerifyIssue[] {
  return report.issues
    .filter(
      (i) =>
        (i.severity === "error" || i.severity === "warning") &&
        i.fixTarget != null &&
        i.fixTarget.kind !== "unknown" &&
        i.confidence >= 0.5,
    )
    .sort((a, b) => {
      const sev = (s: string) => (s === "error" ? 0 : s === "warning" ? 1 : 2);
      const d = sev(a.severity) - sev(b.severity);
      if (d !== 0) return d;
      return b.confidence - a.confidence;
    });
}

export function buildFixInput(input: {
  reportId: string;
  report: VerifyReport;
}): FixInput {
  return {
    projectId: input.report.meta.projectId,
    planId: input.report.meta.planId,
    reportId: input.reportId,
    report: input.report,
    actionableIssues: selectActionableIssues(input.report),
  };
}

export function isReportReadyForFix(status: VerifyReportStatus): boolean {
  return status === "failed" || status === "warning" || status === "passed";
}

/** True se o loop Fix deve iniciar (há erros ou ainda não elegível a preview). */
export function shouldAutoFix(report: VerifyReport): boolean {
  if (!isVerifyClean(report)) return true;
  return false;
}

export function draftsFromFixInput(input: FixInput): FixActionDraft[] {
  return input.actionableIssues.map((issue, index) => ({
    issueId: issue.id,
    target: issue.fixTarget!,
    priority: index,
  }));
}
