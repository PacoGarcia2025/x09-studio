"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BuilderPanel } from "@/components/builder/BuilderPanel";
import { FixPanel } from "@/components/fix/FixPanel";
import { PlannerPanel } from "@/components/planner/PlannerPanel";
import { ProjectFilesPanel } from "@/components/projects/ProjectFilesPanel";
import { VerifyPanel } from "@/components/verify/VerifyPanel";
import type { StudioPlan } from "@/lib/pipeline/plan-schema";

type MainTab = "preview" | "code" | "layers" | "pipeline";

type ChatItem = { role: "user" | "ai"; text: string; working?: boolean };

type Props = {
  project: {
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
  };
  planId: string | null;
  initialPrompt?: string;
  initialPlan?: StudioPlan | null;
  initialModel?: string | null;
  autoStart?: boolean;
};

/**
 * Workspace Lovable: top bar + chat lateral + preview full-bleed até o rodapé.
 */
export function ProjectWorkspace({
  project,
  planId,
  initialPrompt,
  initialPlan,
  initialModel,
  autoStart = false,
}: Props) {
  const [mainTab, setMainTab] = useState<MainTab>("preview");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(autoStart);
  const [chatLog, setChatLog] = useState<ChatItem[]>(() => {
    if (!initialPrompt) return [];
    return [
      { role: "user", text: initialPrompt },
      {
        role: "ai",
        working: autoStart,
        text: autoStart
          ? "Entendi seu pedido. Estou montando a estrutura e começando a geração agora…"
          : "Entendi o pedido. Posso ajustar detalhes pelo chat ou iniciar a geração no Pipeline.",
      },
    ];
  });
  const [verifyToken, setVerifyToken] = useState(0);
  const [fixToken, setFixToken] = useState(0);
  const [lastVerifyReportId, setLastVerifyReportId] = useState<string | null>(
    null,
  );
  const [developerMode, setDeveloperMode] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (!autoStart || !initialPlan) return;
    setChatLog((prev) => {
      const already = prev.some((m) => m.text.includes("Plano pronto"));
      if (already) return prev;
      return [
        ...prev.filter((m) => !m.working),
        {
          role: "ai",
          text: `Plano pronto: ${initialPlan.summary.slice(0, 180)}. Estou gerando o preview…`,
          working: true,
        },
      ];
    });
  }, [autoStart, initialPlan]);

  const statusLabel = useMemo(() => {
    if (isGenerating || project.status === "generating") return "Gerando…";
    if (project.status === "published") return "Publicado";
    return "Visualizando a última versão salva";
  }, [isGenerating, project.status]);

  function sendChat() {
    const value = prompt.trim();
    if (!value) return;
    setChatLog((prev) => [
      ...prev,
      { role: "user", text: value },
      {
        role: "ai",
        text: "Recebido. Abra a aba Pipeline para aplicar essa alteração no Builder.",
      },
    ]);
    setPrompt("");
    setMainTab("pipeline");
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#F7F7F8]">
      {/* Top bar Lovable */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-3">
        <Link
          href="/projects"
          className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
          title="Voltar"
        >
          ←
        </Link>
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-500 text-[9px] font-bold text-white">
          X09
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {project.name}
          </p>
          <p className="truncate text-[11px] text-zinc-500">{statusLabel}</p>
        </div>

        <div className="mx-auto hidden h-9 items-center gap-0.5 rounded-full bg-zinc-100 p-1 sm:flex">
          {(
            [
              ["preview", "Pré-visualização"],
              ["code", "Código"],
              ["layers", "Camadas"],
              ["pipeline", "Pipeline"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMainTab(id)}
              className={`h-7 rounded-full px-3 text-xs font-medium transition ${
                mainTab === id
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPreviewKey((k) => k + 1)}
            className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100"
          >
            Atualizar preview
          </button>
          <span className="hidden rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-600 md:inline">
            Página inicial
          </span>
          <button
            type="button"
            onClick={() => setDeveloperMode((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              developerMode
                ? "bg-orange-100 text-orange-800"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            Dev
          </button>
          <button
            type="button"
            className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
          >
            Atualizar
          </button>
          <a
            href={`https://${project.slug}.studio.x09.com.br`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
          >
            Publicar
          </a>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Chat lateral */}
        <aside className="flex w-full max-w-[380px] shrink-0 flex-col border-r border-zinc-200 bg-white md:w-[32%]">
          <div className="border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-900">Chat X09</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              IA: {initialModel ?? "X09 Router"}
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {chatLog.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-zinc-400">
                Descreva o que quer criar ou alterar.
              </p>
            ) : (
              chatLog.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                      msg.role === "user"
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-50 text-zinc-800 ring-1 ring-zinc-100"
                    }`}
                  >
                    {msg.text}
                    {msg.working ? (
                      <span className="mt-2 block text-xs text-violet-600">
                        Trabalhando…
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-zinc-100 p-3">
            <div className="rounded-[22px] border border-zinc-200 bg-white p-2 shadow-sm">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Pergunte ao X09…"
                rows={2}
                className="w-full resize-none border-0 bg-transparent px-2 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
              />
              <div className="flex items-center justify-end gap-2 px-1 pb-1">
                <button
                  type="button"
                  onClick={sendChat}
                  className="rounded-full bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                >
                  Construir
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Preview / content — full height até o rodapé */}
        <section className="relative min-w-0 flex-1 overflow-hidden bg-zinc-100">
          {mainTab === "preview" ? (
            <iframe
              key={previewKey}
              title={`Preview ${project.name}`}
              src={`/api/projects/${project.id}/card-preview`}
              className="absolute inset-0 h-full w-full border-0 bg-white"
            />
          ) : null}

          {mainTab === "code" ? (
            <div className="absolute inset-0 overflow-auto bg-white p-4">
              <ProjectFilesPanel projectId={project.id} />
            </div>
          ) : null}

          {mainTab === "layers" ? (
            <div className="absolute inset-0 grid place-items-center bg-white">
              <p className="text-sm text-zinc-500">
                Camadas / Visual Edits em breve
              </p>
            </div>
          ) : null}

          <div
            className={`absolute inset-0 space-y-4 overflow-y-auto bg-[#F7F7F8] p-4 ${
              mainTab === "pipeline" ? "block" : "hidden"
            }`}
          >
              <PlannerPanel
                projectId={project.id}
                initialPrompt={initialPrompt}
                initialPlan={initialPlan}
                initialModel={initialModel}
              />
              <BuilderPanel
                planId={planId}
                projectId={project.id}
                autoStart={autoStart}
                onBuildSuccess={() => {
                  setIsGenerating(false);
                  setVerifyToken((t) => t + 1);
                  setPreviewKey((k) => k + 1);
                  setChatLog((prev) => [
                    ...prev.filter((m) => !m.working),
                    {
                      role: "ai",
                      text: "A primeira versão foi gerada. Estou validando o resultado e o preview já foi atualizado.",
                    },
                  ]);
                }}
              />
              <VerifyPanel
                projectId={project.id}
                planId={planId}
                autoStartToken={verifyToken}
                onVerifyComplete={(state) => {
                  setLastVerifyReportId(state.reportId);
                  setFixToken((t) => t + 1);
                }}
              />
              <FixPanel
                projectId={project.id}
                planId={planId}
                verifyReportId={lastVerifyReportId}
                autoStartToken={fixToken}
              />
          </div>
        </section>
      </div>
    </div>
  );
}
