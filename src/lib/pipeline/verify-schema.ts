import { z } from "zod";

/** Categorias exibidas na UI do Verify (Sprint 5). */
export const verifyCategoryIdSchema = z.enum([
  "build",
  "lint",
  "typescript",
  "dependencies",
  "database",
  "env",
  "structure",
]);

export type VerifyCategoryId = z.infer<typeof verifyCategoryIdSchema>;

export const VERIFY_CATEGORY_ORDER: VerifyCategoryId[] = [
  "structure",
  "env",
  "dependencies",
  "database",
  "typescript",
  "lint",
  "build",
];

export const VERIFY_CATEGORY_LABELS: Record<VerifyCategoryId, string> = {
  build: "Build",
  lint: "Lint",
  typescript: "TypeScript",
  dependencies: "Dependências",
  database: "Banco",
  env: "Env",
  structure: "Estrutura",
};

/** Status por categoria na UI. */
export const verifyCheckStatusSchema = z.enum([
  "pending",
  "running",
  "success",
  "warning",
  "failed",
]);

export type VerifyCheckStatus = z.infer<typeof verifyCheckStatusSchema>;

export const verifySeveritySchema = z.enum(["error", "warning", "info"]);
export type VerifySeverity = z.infer<typeof verifySeveritySchema>;

export const verifyIssueSourceSchema = z.enum([
  "compiler",
  "linter",
  "static",
  "tool",
  "ai",
]);

/**
 * Hint tipado para o Fix Engine (Sprint 6).
 * O Verify só sugere — nunca aplica correções.
 */
export const verifyFixTargetSchema = z.object({
  kind: z.enum([
    "edit_file",
    "create_file",
    "delete_file",
    "install_package",
    "set_env",
    "sql_migration",
    "run_command",
    "unknown",
  ]),
  path: z.string().optional(),
  packageName: z.string().optional(),
  envKey: z.string().optional(),
  detail: z.string().optional(),
});

export type VerifyFixTarget = z.infer<typeof verifyFixTargetSchema>;

export const verifyIssueSchema = z.object({
  id: z.string().min(1),
  category: verifyCategoryIdSchema,
  severity: verifySeveritySchema,
  code: z.string().min(1),
  message: z.string().min(1),
  file: z.string().nullable().optional(),
  line: z.number().int().positive().nullable().optional(),
  column: z.number().int().positive().nullable().optional(),
  suggestion: z.string().min(1),
  /** 0–1: confiança da análise (tools ~0.9+, AI ~0.5–0.85). */
  confidence: z.number().min(0).max(1),
  source: verifyIssueSourceSchema,
  fixTarget: verifyFixTargetSchema.nullable().optional(),
});

export type VerifyIssue = z.infer<typeof verifyIssueSchema>;

export const verifyCategoryResultSchema = z.object({
  status: verifyCheckStatusSchema,
  summary: z.string().optional(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
});

export type VerifyCategoryResult = z.infer<typeof verifyCategoryResultSchema>;

export const verifyToolTraceSchema = z.object({
  category: verifyCategoryIdSchema,
  command: z.string().optional(),
  exitCode: z.number().nullable().optional(),
  output: z.string(),
  durationMs: z.number().int().nonnegative().optional(),
});

export type VerifyToolTrace = z.infer<typeof verifyToolTraceSchema>;

export const verifyReportStatusSchema = z.enum([
  "running",
  "passed",
  "warning",
  "failed",
  "error",
]);

export type VerifyReportStatus = z.infer<typeof verifyReportStatusSchema>;

/** Contrato persistido em verify_reports.report_json — consumido pelo Fix. */
export const verifyReportSchema = z.object({
  version: z.literal(1),
  status: verifyReportStatusSchema,
  summary: z.string(),
  categories: z.object({
    build: verifyCategoryResultSchema,
    lint: verifyCategoryResultSchema,
    typescript: verifyCategoryResultSchema,
    dependencies: verifyCategoryResultSchema,
    database: verifyCategoryResultSchema,
    env: verifyCategoryResultSchema,
    structure: verifyCategoryResultSchema,
  }),
  issues: z.array(verifyIssueSchema),
  toolTraces: z.array(verifyToolTraceSchema).default([]),
  /** Próximo check a executar (fila client-driven). */
  nextCategory: verifyCategoryIdSchema.nullable(),
  meta: z.object({
    projectId: z.string().uuid(),
    planId: z.string().uuid().nullable(),
    startedAt: z.string(),
    finishedAt: z.string().nullable().optional(),
    analyzeModel: z.string().nullable().optional(),
  }),
});

export type VerifyReport = z.infer<typeof verifyReportSchema>;

export function emptyCategories(): VerifyReport["categories"] {
  const pending = (): VerifyCategoryResult => ({ status: "pending" });
  return {
    structure: pending(),
    env: pending(),
    dependencies: pending(),
    database: pending(),
    typescript: pending(),
    lint: pending(),
    build: pending(),
  };
}

export function createEmptyVerifyReport(input: {
  projectId: string;
  planId: string | null;
}): VerifyReport {
  return {
    version: 1,
    status: "running",
    summary: "Verify em execução…",
    categories: emptyCategories(),
    issues: [],
    toolTraces: [],
    nextCategory: VERIFY_CATEGORY_ORDER[0] ?? null,
    meta: {
      projectId: input.projectId,
      planId: input.planId,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      analyzeModel: null,
    },
  };
}

export function deriveOverallStatus(
  categories: VerifyReport["categories"],
  issues: VerifyIssue[],
): Exclude<VerifyReportStatus, "running" | "error"> {
  const statuses = Object.values(categories).map((c) => c.status);
  if (statuses.some((s) => s === "failed")) return "failed";
  if (
    statuses.some((s) => s === "warning") ||
    issues.some((i) => i.severity === "warning")
  ) {
    return "warning";
  }
  if (issues.some((i) => i.severity === "error")) return "failed";
  return "passed";
}
