"use client";

import { useState } from "react";
import { BuilderPanel } from "@/components/builder/BuilderPanel";
import { FixPanel } from "@/components/fix/FixPanel";
import { PlannerPanel } from "@/components/planner/PlannerPanel";
import { VerifyPanel } from "@/components/verify/VerifyPanel";
import type { StudioPlan } from "@/lib/pipeline/plan-schema";

type Props = {
  projectId: string;
  planId: string | null;
  initialPrompt?: string;
  initialPlan?: StudioPlan | null;
  initialModel?: string | null;
};

/**
 * Planner → Builder → Verify → Fix → Verify… (Preview na Sprint 7).
 */
export function ProjectPipeline({
  projectId,
  planId,
  initialPrompt,
  initialPlan,
  initialModel,
}: Props) {
  const [verifyToken, setVerifyToken] = useState(0);
  const [fixToken, setFixToken] = useState(0);
  const [lastVerifyReportId, setLastVerifyReportId] = useState<string | null>(
    null,
  );

  return (
    <>
      <section className="space-y-3 border-t border-zinc-900 pt-8">
        <h2 className="text-lg font-medium">Planner</h2>
        <p className="text-sm text-zinc-500">
          Prompt → plano estruturado (JSON + tasks).
        </p>
        <PlannerPanel
          projectId={projectId}
          initialPrompt={initialPrompt}
          initialPlan={initialPlan}
          initialModel={initialModel}
        />
      </section>

      <section className="space-y-3 border-t border-zinc-900 pt-8">
        <h2 className="text-lg font-medium">Builder</h2>
        <p className="text-sm text-zinc-500">
          Tasks → FileSystem. Depois de gerar o plano, execute o Builder.
          Atualize a árvore de arquivos para ver as mudanças.
        </p>
        <BuilderPanel
          planId={planId}
          projectId={projectId}
          onBuildSuccess={() => setVerifyToken((n) => n + 1)}
        />
      </section>

      <section className="space-y-3 border-t border-zinc-900 pt-8">
        <h2 className="text-lg font-medium">Verify</h2>
        <p className="text-sm text-zinc-500">
          Analisa o projeto gerado. Não altera arquivos — só produz relatório.
        </p>
        <VerifyPanel
          planId={planId}
          projectId={projectId}
          autoStartToken={verifyToken}
          onVerifyComplete={(state) => {
            setLastVerifyReportId(state.reportId);
            setFixToken((n) => n + 1);
          }}
        />
      </section>

      <section className="space-y-3 border-t border-zinc-900 pt-8">
        <h2 className="text-lg font-medium">Auto Fix</h2>
        <p className="text-sm text-zinc-500">
          Consome o Verify Report e corrige automaticamente até 0 erros ou o
          limite de tentativas. Re-verify após cada rodada.
        </p>
        <FixPanel
          planId={planId}
          projectId={projectId}
          autoStartToken={fixToken}
          verifyReportId={lastVerifyReportId}
        />
      </section>
    </>
  );
}
