"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  getVerifyState,
  startVerifyAction,
  tickVerifyAction,
  type VerifyState,
} from "@/lib/pipeline/verify.actions";
import {
  VERIFY_CATEGORY_LABELS,
  VERIFY_CATEGORY_ORDER,
  type VerifyCategoryId,
  type VerifyCheckStatus,
  type VerifyIssue,
} from "@/lib/pipeline/verify-schema";

type Props = {
  planId: string | null;
  projectId: string;
  /** Quando true, inicia Verify automaticamente (após Builder OK). */
  autoStartToken?: number;
  /** Chamado quando o Verify termina (sucesso ou falha com relatório). */
  onVerifyComplete?: (state: VerifyState) => void;
};

export function VerifyPanel({
  planId,
  projectId,
  autoStartToken = 0,
  onVerifyComplete,
}: Props) {
  const [state, setState] = useState<VerifyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [pending, startTransition] = useTransition();
  const runningRef = useRef(false);
  const lastAutoToken = useRef(0);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await getVerifyState(projectId, planId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setState(result.data);
      setError(null);
    });
  }, [projectId, planId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function runVerify() {
    if (!planId || runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setError(null);

    const start = await startVerifyAction(planId);
    if (!start.ok) {
      setError(start.error);
      runningRef.current = false;
      setRunning(false);
      return;
    }

    let guard = 0;
    let reportId = start.reportId;
    let last: VerifyState | null = null;
    while (guard < 20) {
      guard += 1;
      const tick = await tickVerifyAction(reportId);
      if (!tick.ok) {
        setError(tick.error);
        break;
      }
      setState(tick.data);
      last = tick.data;
      reportId = tick.data.reportId;
      if (tick.done) break;
    }

    runningRef.current = false;
    setRunning(false);
    if (last && last.status !== "running") {
      onVerifyComplete?.(last);
    }
    refresh();
  }

  useEffect(() => {
    if (!autoStartToken || autoStartToken === lastAutoToken.current) return;
    if (!planId) return;
    lastAutoToken.current = autoStartToken;
    void runVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispara só no token pós-Builder
  }, [autoStartToken, planId]);

  if (!planId) {
    return (
      <p className="text-sm text-zinc-500">
        Gere um plano e execute o Builder para habilitar o Verify.
      </p>
    );
  }

  const report = state?.report;
  const issues = report?.issues ?? [];
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const passedChecks = report
    ? Object.values(report.categories).filter((c) => c.status === "success")
        .length
    : 0;
  const healthScore = report
    ? Math.max(0, Math.min(100, 100 - errorCount * 16 - warningCount * 5))
    : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="x09-card-soft rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-violet-300">
            Health Score
          </p>
          <div className="mt-5 text-5xl font-semibold text-white">
            {healthScore ?? "--"}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {passedChecks}/7 checks aprovados
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <VerifyMetric label="Erros" value={String(errorCount)} tone="red" />
          <VerifyMetric label="Warnings" value={String(warningCount)} tone="amber" />
          <VerifyMetric
            label="Tempo de análise"
            value={state?.finishedAt ? "concluído" : running ? "running" : "--"}
            tone="violet"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void runVerify()}
          disabled={running || pending}
          className="x09-button rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {running ? "Verify em execução…" : "Executar Verify"}
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={pending || running}
          className="x09-muted-button rounded-2xl px-3 py-2 text-xs text-zinc-300"
        >
          Atualizar
        </button>
        {state ? (
          <span className="text-xs text-zinc-500">
            status: {state.status}
            {state.model ? ` · IA: ${state.model}` : ""}
          </span>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {state?.summary ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
          {state.summary}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {VERIFY_CATEGORY_ORDER.map((cat) => {
          const catStatus: VerifyCheckStatus =
            report?.categories[cat]?.status ?? "pending";
          return (
            <CategoryCard
              key={cat}
              id={cat}
              status={running && catStatus === "running" ? "running" : catStatus}
              summary={report?.categories[cat]?.summary}
            />
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="x09-card-soft max-h-[420px] space-y-2 overflow-auto rounded-3xl p-4">
          <h3 className="text-sm font-medium text-zinc-200">
            Issues ({issues.length})
          </h3>
          {issues.length === 0 ? (
            <p className="text-xs text-zinc-500">
              {state?.status === "passed"
                ? "Nenhum problema encontrado."
                : "Sem issues ainda — execute o Verify."}
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </ul>
          )}
        </div>

        <details className="x09-card-soft max-h-[420px] overflow-auto rounded-3xl p-4">
          <summary className="cursor-pointer text-sm font-medium text-zinc-200">
            Tool traces
          </summary>
          <ul className="space-y-2 font-mono text-[11px] text-zinc-500">
            {(report?.toolTraces ?? []).length === 0 ? (
              <li>Sem saída de ferramentas ainda.</li>
            ) : (
              (report?.toolTraces ?? []).map((t, i) => (
                <li key={`${t.category}-${i}`} className="whitespace-pre-wrap">
                  <span className="text-zinc-400">
                    [{t.category}] {t.command ?? "static"} exit=
                    {t.exitCode ?? "—"}
                  </span>
                  {"\n"}
                  {t.output.slice(-1200)}
                </li>
              ))
            )}
          </ul>
        </details>
      </div>

      <p className="text-xs text-zinc-600">
        O Verify não altera arquivos-fonte. O relatório fica em{" "}
        <code className="text-zinc-500">verify_reports</code> para o Fix (Sprint
        6) consumir automaticamente.
      </p>
    </div>
  );
}

function CategoryCard({
  id,
  status,
  summary,
}: {
  id: VerifyCategoryId;
  status: VerifyCheckStatus;
  summary?: string;
}) {
  return (
    <div className="x09-card-soft space-y-1 rounded-3xl px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-zinc-200">
          {statusIcon(status)} {VERIFY_CATEGORY_LABELS[id]}
        </span>
        <CheckStatusBadge status={status} />
      </div>
      {summary ? (
        <p className="text-[11px] text-zinc-500 line-clamp-2">{summary}</p>
      ) : null}
    </div>
  );
}

function statusIcon(status: VerifyCheckStatus): string {
  switch (status) {
    case "success":
      return "✔";
    case "failed":
      return "✖";
    case "warning":
      return "!";
    case "running":
      return "…";
    default:
      return "○";
  }
}

function CheckStatusBadge({ status }: { status: VerifyCheckStatus }) {
  const color =
    status === "success"
      ? "text-emerald-400"
      : status === "failed"
        ? "text-red-400"
        : status === "warning"
          ? "text-amber-300"
          : status === "running"
            ? "text-sky-300"
            : "text-zinc-500";
  const label =
    status === "success"
      ? "Success"
      : status === "failed"
        ? "Failed"
        : status === "warning"
          ? "Warning"
          : status === "running"
            ? "Running"
            : "Pending";
  return <span className={`text-xs ${color}`}>{label}</span>;
}

function IssueRow({ issue }: { issue: VerifyIssue }) {
  const color =
    issue.severity === "error"
      ? "text-red-400"
      : issue.severity === "warning"
        ? "text-amber-300"
        : "text-zinc-400";
  return (
    <li className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={color}>{issue.severity}</span>
        <span className="text-zinc-500">{issue.category}</span>
        <span className="text-zinc-600">{issue.code}</span>
        <span className="text-zinc-600">
          conf {(issue.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <p className="text-zinc-300 mt-0.5">{issue.message}</p>
      {issue.file ? (
        <p className="text-zinc-600">
          {issue.file}
          {issue.line ? `:${issue.line}` : ""}
        </p>
      ) : null}
      <p className="text-zinc-500 mt-0.5">→ {issue.suggestion}</p>
      {issue.fixTarget ? (
        <p className="text-zinc-600 mt-0.5">
          fix: {issue.fixTarget.kind}
          {issue.fixTarget.path ? ` · ${issue.fixTarget.path}` : ""}
        </p>
      ) : null}
    </li>
  );
}

function VerifyMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "red" | "amber" | "violet";
}) {
  const glow =
    tone === "red"
      ? "text-red-200"
      : tone === "amber"
        ? "text-amber-200"
        : "text-violet-200";
  return (
    <div className="x09-card-soft rounded-3xl p-5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${glow}`}>{value}</p>
    </div>
  );
}
