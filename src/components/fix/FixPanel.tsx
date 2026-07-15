"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  getFixState,
  startAutoFixAction,
  tickAutoFixAction,
  type FixStatePayload,
} from "@/lib/pipeline/fix.actions";

type Props = {
  planId: string | null;
  projectId: string;
  /** Dispara Auto Fix após Verify concluir (token incrementado). */
  autoStartToken?: number;
  /** Verify report id opcional (senão usa o mais recente). */
  verifyReportId?: string | null;
};

export function FixPanel({
  planId,
  projectId,
  autoStartToken = 0,
  verifyReportId = null,
}: Props) {
  const [data, setData] = useState<FixStatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pending, startTransition] = useTransition();
  const runningRef = useRef(false);
  const lastAutoToken = useRef(0);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await getFixState(projectId, planId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setData(result.data);
      setError(null);
    });
  }, [projectId, planId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function runAutoFix() {
    if (!planId || runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setError(null);

    const start = await startAutoFixAction(planId, {
      verifyReportId: verifyReportId ?? undefined,
    });
    if (!start.ok) {
      setError(start.error);
      runningRef.current = false;
      setRunning(false);
      return;
    }

    setData(start.data);

    // Já concluído (projeto limpo no start)
    if (start.data.public.status !== "running") {
      runningRef.current = false;
      setRunning(false);
      refresh();
      return;
    }

    let fixRunId = start.fixRunId;
    let guard = 0;
    while (guard < 80) {
      guard += 1;
      const tick = await tickAutoFixAction(fixRunId);
      if (!tick.ok) {
        setError(tick.error);
        break;
      }
      setData(tick.data);
      fixRunId = tick.data.public.fixRunId;
      if (tick.done) break;
    }

    runningRef.current = false;
    setRunning(false);
    refresh();
  }

  useEffect(() => {
    if (!autoStartToken || autoStartToken === lastAutoToken.current) return;
    if (!planId) return;
    lastAutoToken.current = autoStartToken;
    void runAutoFix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartToken, planId]);

  if (!planId) {
    return (
      <p className="text-sm text-zinc-500">
        Conclua Builder e Verify para habilitar o Auto Fix.
      </p>
    );
  }

  const pub = data?.public;
  const adv = data?.advanced;
  const isBusy = running || pub?.running;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void runAutoFix()}
          disabled={isBusy || pending}
          className="x09-button rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isBusy ? "✨ Corrigindo automaticamente..." : "Executar Auto Fix"}
        </button>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="x09-muted-button rounded-2xl px-3 py-2 text-xs text-zinc-300"
        >
          {showAdvanced ? "Ocultar avançado" : "Painel avançado"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {/* Vista pública — sem detalhes técnicos */}
      <div className="x09-card-soft overflow-hidden rounded-[2rem] px-4 py-10 text-center">
        {isBusy ? (
          <div className="space-y-5">
            <div className="mx-auto h-20 w-20 rounded-full border border-violet-400/25 bg-violet-500/10 p-2">
              <div
                className="h-full w-full rounded-full border border-violet-300/40"
                style={{ animation: "x09-orbit 2.8s linear infinite" }}
              />
            </div>
            <p className="text-lg text-zinc-100">✨ Corrigindo automaticamente...</p>
            <p className="text-sm text-zinc-500">
              O X09 está aplicando correções e revalidando o projeto.
            </p>
          </div>
        ) : pub ? (
          <>
            <p className="text-lg text-zinc-100">{pub.message}</p>
            <ul className="mt-4 space-y-1 text-sm text-zinc-400">
              {pub.verified ? <li>✔ Projeto verificado</li> : null}
              {pub.corrected || pub.status === "succeeded" ? (
                <li>✔ Projeto corrigido</li>
              ) : null}
              {pub.healthScore != null ? (
                <li>✔ Health Score: {pub.healthScore}</li>
              ) : null}
              {pub.previewReady ? (
                <li className="text-emerald-400">✔ Pronto para Preview</li>
              ) : null}
            </ul>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            O Auto Fix inicia após o Verify. Usuários veem apenas o progresso
            simples.
          </p>
        )}
      </div>

      {showAdvanced && adv ? (
        <div className="x09-card-soft rounded-[2rem] p-5 text-xs text-zinc-400">
          <h3 className="text-sm font-medium text-amber-200/90">
            Painel avançado
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Tentativas" value={`${adv.attemptCount}/${adv.maxAttempts}`} />
            <Metric
              label="Tempo total"
              value={
                adv.totalDurationMs != null
                  ? `${(adv.totalDurationMs / 1000).toFixed(1)}s`
                  : "—"
              }
            />
            <Metric label="Correções" value={String(adv.fixesApplied)} />
            <Metric label="Falhas" value={String(adv.fixesFailed)} />
            <Metric
              label="% sucesso"
              value={
                adv.successRate != null ? `${adv.successRate}%` : "—"
              }
            />
            <Metric
              label="Health"
              value={adv.healthScore != null ? String(adv.healthScore) : "—"}
            />
          </div>

          <div>
            <p className="text-zinc-500 mb-1">Arquivos alterados</p>
            {adv.filesChanged.length === 0 ? (
              <p>—</p>
            ) : (
              <ul className="font-mono space-y-0.5">
                {adv.filesChanged.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-zinc-500 mb-1">Histórico de tentativas</p>
            {adv.attempts.length === 0 ? (
              <p>—</p>
            ) : (
              <ul className="space-y-2">
                {adv.attempts.map((a) => (
                  <li
                    key={a.attempt}
                    className="border-b border-zinc-900 pb-2 font-mono"
                  >
                    #{a.attempt}: erros {a.errorsBefore}→{a.errorsAfter ?? "?"} ·
                    health {a.healthBefore}→{a.healthAfter ?? "?"} · fixes{" "}
                    {a.fixesApplied}/{a.fixesAttempted}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {adv.lastApplied.length > 0 ? (
            <div>
              <p className="text-zinc-500 mb-1">Últimas correções</p>
              <ul className="font-mono space-y-0.5">
                {adv.lastApplied.map((item) => (
                  <li
                    key={item.issueId}
                    className={item.ok ? "text-emerald-500/80" : "text-red-400"}
                  >
                    [{item.kind}] {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {adv.errorMessage ? (
            <p className="text-red-400">{adv.errorMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-900 px-2 py-1.5">
      <div className="text-zinc-600">{label}</div>
      <div className="text-zinc-200">{value}</div>
    </div>
  );
}
