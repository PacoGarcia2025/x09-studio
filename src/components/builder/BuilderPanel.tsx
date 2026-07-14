"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  getBuildState,
  startBuildAction,
  tickBuildAction,
  type BuildState,
} from "@/lib/pipeline/builder.actions";

type Props = {
  planId: string | null;
  projectId: string;
  /** Chamado quando o Builder termina com sucesso (hook → Verify). */
  onBuildSuccess?: () => void;
};

export function BuilderPanel({ planId, projectId, onBuildSuccess }: Props) {
  const [state, setState] = useState<BuildState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [pending, startTransition] = useTransition();
  const runningRef = useRef(false);

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

  async function runQueue() {
    if (!planId || runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setError(null);

    const start = await startBuildAction(planId);
    if (!start.ok) {
      setError(start.error);
      runningRef.current = false;
      setRunning(false);
      return;
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
  }

  async function refreshState(id: string) {
    const result = await getBuildState(id);
    if (result.ok) setState(result.data);
  }

  if (!planId) {
    return (
      <p className="text-sm text-zinc-500">
        Gere um plano no Planner para habilitar o Builder.
      </p>
    );
  }

  const counts = state?.counts;
  const current =
    state?.tasks.find((t) => t.status === "running") ??
    state?.tasks.find((t) => t.status === "queued") ??
    null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void runQueue()}
          disabled={running || pending}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        >
          {running ? "Builder em execução…" : "Executar Builder"}
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={pending || running}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Atualizar
        </button>
        {counts ? (
          <span className="text-xs text-zinc-500">
            {counts.done}/{counts.total} done · {counts.queued} queued ·{" "}
            {counts.failed} failed · plano: {state?.planStatus}
          </span>
        ) : null}
      </div>

      {current ? (
        <p className="text-sm text-zinc-300">
          Task atual:{" "}
          <span className="text-zinc-100">
            [{current.type}] {current.task_key} — {current.title}
          </span>
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-900 p-3 space-y-2 max-h-[360px] overflow-auto">
          <h3 className="text-sm font-medium text-zinc-200">Fila</h3>
          <ul className="space-y-1 text-xs">
            {(state?.tasks ?? []).map((task) => (
              <li
                key={task.id}
                className="flex items-start justify-between gap-2 border-b border-zinc-900/80 py-1.5"
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
                <StatusBadge status={task.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-zinc-900 p-3 space-y-2 max-h-[360px] overflow-auto">
          <h3 className="text-sm font-medium text-zinc-200">Logs</h3>
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
        </div>
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
        : status === "running"
          ? "text-amber-300"
          : "text-zinc-500";
  return <span className={color}>{status}</span>;
}
