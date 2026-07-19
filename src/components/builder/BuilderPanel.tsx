"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  getBuildState,
  requeueBuildTaskAction,
  startBuildAction,
  tickBuildAction,
  type BuildState,
} from "@/lib/pipeline/builder.actions";

type Props = {
  planId: string | null;
  projectId: string;
  autoStart?: boolean;
  /** Chamado quando o Builder termina com sucesso (hook → Verify). */
  onBuildSuccess?: () => void;
};

export function BuilderPanel({
  planId,
  projectId,
  autoStart = false,
  onBuildSuccess,
}: Props) {
  const [state, setState] = useState<BuildState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [pending, startTransition] = useTransition();
  const runningRef = useRef(false);
  const autoStartedRef = useRef(false);

  const refresh = useCallback(() => {
    if (!planId) return;
    startTransition(async () => {
      const result = await getBuildState(planId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setState(result.data);
      setError(null);
    });
  }, [planId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshState = useCallback(async (id: string) => {
    const result = await getBuildState(id);
    if (result.ok) setState(result.data);
  }, []);

  const runQueue = useCallback(
    async (options: { reset: boolean } = { reset: true }) => {
      if (!planId || runningRef.current) return;
      runningRef.current = true;
      setRunning(true);
      setError(null);

      if (options.reset) {
        const start = await startBuildAction(planId);
        if (!start.ok) {
          setError(start.error);
          runningRef.current = false;
          setRunning(false);
          return;
        }
      }

      let guard = 0;
      let endedOk = false;
      while (guard < 80) {
        guard += 1;
        const tick = await tickBuildAction(planId);
        if (!tick.ok) {
          setError(tick.error);
          break;
        }
        await refreshState(planId);
        if (tick.done) {
          endedOk = !tick.failed;
          break;
        }
      }

      runningRef.current = false;
      setRunning(false);
      refresh();
      if (endedOk) onBuildSuccess?.();
    },
    [onBuildSuccess, planId, refresh, refreshState],
  );

  useEffect(() => {
    if (!autoStart || !planId || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void runQueue();
  }, [autoStart, planId, runQueue]);

  async function requeueTask(taskId: string) {
    if (!planId || runningRef.current) return;
    setError(null);
    const result = await requeueBuildTaskAction(taskId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await refreshState(planId);
    void runQueue({ reset: false });
  }

  if (!planId) {
    return (
      <p className="text-sm text-zinc-500">
        Gere um plano no Planner para habilitar o Builder.
      </p>
    );
  }

  const counts = state?.counts;
  const progress = counts?.total
    ? Math.round((counts.done / counts.total) * 100)
    : 0;
  const current =
    state?.tasks.find((t) => t.status === "running") ??
    state?.tasks.find((t) => t.status === "retrying") ??
    state?.tasks.find((t) => t.status === "queued") ??
    null;

  return (
    <div className="space-y-4">
      <div className="x09-card-soft rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">
              {current
                ? `[${current.type}] ${current.title}`
                : "Nenhuma task em execução"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Task atual · arquivos, comandos e SQL são aplicados em disco.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-white">{progress}%</p>
            <p className="text-xs text-zinc-500">progresso</p>
          </div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-white/7">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-sky-300 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void runQueue()}
          disabled={running || pending}
          className="x09-button rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {running ? "Builder em execução…" : "Executar Builder"}
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={pending || running}
          className="x09-muted-button rounded-2xl px-3 py-2 text-xs text-zinc-300"
        >
          Atualizar
        </button>
        {counts ? (
          <span className="text-xs text-zinc-500">
            {counts.done}/{counts.total} done · {counts.queued} queued ·{" "}
            {counts.retrying} retrying · {counts.failed} failed · plano:{" "}
            {state?.planStatus}
          </span>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="x09-card-soft max-h-[420px] space-y-2 overflow-auto rounded-3xl p-4">
          <h3 className="text-sm font-medium text-zinc-200">Fila</h3>
          <ul className="space-y-1 text-xs">
            {(state?.tasks ?? []).map((task) => (
              <li
                key={task.id}
                className="flex items-start justify-between gap-2 rounded-2xl border border-white/8 bg-white/[0.025] px-3 py-2"
              >
                <span className="text-zinc-300">
                  <span className="text-zinc-500">{task.task_key}</span>{" "}
                  [{task.type}] {task.title}
                  {task.path ? (
                    <span className="block text-zinc-600">{task.path}</span>
                  ) : null}
                  {task.error_message ? (
                    <span className="block text-red-400">
                      {task.error_message}
                    </span>
                  ) : null}
                </span>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={task.status} />
                  {task.status === "failed" ? (
                    <button
                      type="button"
                      onClick={() => void requeueTask(task.id)}
                      disabled={running || pending}
                      className="text-[11px] text-sky-300 hover:text-sky-200 disabled:opacity-50"
                    >
                      Reexecutar task
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <details className="x09-card-soft max-h-[420px] overflow-auto rounded-3xl p-4">
          <summary className="cursor-pointer text-sm font-medium text-zinc-200">
            Logs técnicos
          </summary>
          <ul className="space-y-1 font-mono text-[11px] text-zinc-400">
            {(state?.logs ?? []).length === 0 ? (
              <li>Sem logs ainda.</li>
            ) : (
              (state?.logs ?? []).map((log) => (
                <li
                  key={log.id}
                  className={
                    log.level === "error"
                      ? "text-red-400 whitespace-pre-wrap"
                      : "whitespace-pre-wrap"
                  }
                >
                  [{log.level}] {log.message}
                </li>
              ))
            )}
          </ul>
        </details>
      </div>

      <p className="text-xs text-zinc-600">
        Projeto {projectId.slice(0, 8)}… — o Builder altera arquivos em disco via
        STUDIO_PROJECTS_ROOT. Após sucesso, o Verify roda automaticamente.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "done"
      ? "text-emerald-400"
      : status === "failed"
        ? "text-red-400"
        : status === "running" || status === "retrying"
          ? "text-amber-300"
          : "text-zinc-500";
  return <span className={color}>{status}</span>;
}
