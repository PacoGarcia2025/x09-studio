"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BuilderPanel } from "@/components/builder/BuilderPanel";
import { FixPanel } from "@/components/fix/FixPanel";
import { PlannerPanel } from "@/components/planner/PlannerPanel";
import { AutoPlanBootstrap } from "@/components/projects/AutoPlanBootstrap";
import { ProjectFilesPanel } from "@/components/projects/ProjectFilesPanel";
import { ProjectLivePreview } from "@/components/projects/ProjectLivePreview";
import { SilentBuildRunner } from "@/components/projects/SilentBuildRunner";
import { VerifyPanel } from "@/components/verify/VerifyPanel";
import { chatProjectAction } from "@/lib/pipeline/actions";
import { getBuildState } from "@/lib/pipeline/builder.actions";
import type { StudioPlan } from "@/lib/pipeline/plan-schema";
import { PublishPanel } from "@/components/projects/PublishPanel";
import { resolvePublicShareUrl } from "@/lib/projects/publish-url";

type MainTab = "preview" | "code" | "layers" | "pipeline";

type ChatItem =
  | { kind: "user"; text: string }
  | { kind: "ai"; text: string; working?: boolean }
  | {
      kind: "plan";
      planId: string;
      plan: StudioPlan;
      approved?: boolean;
    };

type Props = {
  project: {
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
    published_url?: string | null;
  };
  planId: string | null;
  initialPrompt?: string;
  initialPlan?: StudioPlan | null;
  initialModel?: string | null;
  autoStart?: boolean;
  /** Se true, após gerar o plano pede OK (não constrói sozinho). */
  awaitApproval?: boolean;
  /** Plano salvo mas build nunca iniciou — mostrar botão OK no chat. */
  needsBuildApproval?: boolean;
  canPublish?: boolean;
  publishBlockReason?: string;
};

function plainPlanBlurb(plan: StudioPlan): string {
  const pages = plan.pages
    .slice(0, 4)
    .map((p) => p.name)
    .join(", ");
  const extra =
    plan.pages.length > 4 ? ` e mais ${plan.pages.length - 4}` : "";
  return pages ? `${pages}${extra}` : plan.summary;
}

/**
 * Workspace estilo consumidor: chat + preview.
 * Pipeline técnico só no modo Dev.
 */
export function ProjectWorkspace({
  project,
  planId,
  initialPrompt,
  initialPlan,
  initialModel,
  autoStart = false,
  awaitApproval = true,
  needsBuildApproval = false,
  canPublish = true,
  publishBlockReason,
}: Props) {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<MainTab>("preview");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [isGenerating, setIsGenerating] = useState(
    autoStart || project.status === "generating",
  );
  const [projectStatus, setProjectStatus] = useState(project.status);
  const [activePlanId, setActivePlanId] = useState(planId);
  const [activePlan, setActivePlan] = useState(initialPlan);
  const [activeModel, setActiveModel] = useState(initialModel);
  const [buildEnabled, setBuildEnabled] = useState(
    Boolean(planId && project.status === "generating" && !awaitApproval),
  );
  const [buildFreshStart, setBuildFreshStart] = useState(false);
  const [buildToken, setBuildToken] = useState(0);
  const lastDoneTasksRef = useRef(0);
  const [chatLog, setChatLog] = useState<ChatItem[]>(() => {
    if (!initialPrompt) return [];
    const items: ChatItem[] = [{ kind: "user", text: initialPrompt }];

    if (needsBuildApproval && planId && initialPlan) {
      items.push({
        kind: "ai",
        text: "Plano pronto. Confirme abaixo para construir o app antes de publicar.",
      });
      items.push({
        kind: "plan",
        planId,
        plan: initialPlan,
      });
      return items;
    }

    items.push({
      kind: "ai",
      working: autoStart && !planId,
      text:
        autoStart && !planId
          ? "Entendi seu pedido. Estou preparando a estrutura do app…"
          : "Prompt salvo neste projeto. Use o chat para pedir alterações.",
    });
    return items;
  });
  const [verifyToken, setVerifyToken] = useState(0);
  const [fixToken, setFixToken] = useState(0);
  const [lastVerifyReportId, setLastVerifyReportId] = useState<string | null>(
    null,
  );
  const [developerMode, setDeveloperMode] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [publishPanelOpen, setPublishPanelOpen] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(
    project.published_url
      ? resolvePublicShareUrl(project.slug, project.published_url)
      : null,
  );
  const [publishReady, setPublishReady] = useState(canPublish);
  const [publishBlockMsg, setPublishBlockMsg] = useState(publishBlockReason);
  const [planning, setPlanning] = useState(false);

  useEffect(() => {
    setPublishReady(canPublish);
    setPublishBlockMsg(publishBlockReason);
  }, [canPublish, publishBlockReason]);

  useEffect(() => {
    if (planId) setActivePlanId(planId);
    if (initialPlan) setActivePlan(initialPlan);
    if (initialModel) setActiveModel(initialModel);
    setProjectStatus(project.status);
  }, [initialModel, initialPlan, planId, project.status]);

  useEffect(() => {
    if (developerMode || !activePlanId) return;
    if (projectStatus !== "generating") return;
    setBuildEnabled(true);
    setIsGenerating(true);
  }, [activePlanId, developerMode, projectStatus]);

  useEffect(() => {
    if (!activePlanId || !isGenerating || developerMode || buildEnabled) return;

    const poll = async () => {
      const result = await getBuildState(activePlanId);
      if (!result.ok) return;

      const { counts, planStatus } = result.data;
      if (counts.done > lastDoneTasksRef.current) {
        lastDoneTasksRef.current = counts.done;
        setPreviewKey((k) => k + 1);
      }

      const finished =
        counts.queued === 0 &&
        counts.running === 0 &&
        counts.retrying === 0 &&
        (planStatus === "built" || counts.done + counts.failed === counts.total);

      if (!finished) return;

      if (counts.failed > 0) {
        setIsGenerating(false);
        setProjectStatus("error");
        setPreviewKey((k) => k + 1);
        router.refresh();
        return;
      }

      setIsGenerating(false);
      setProjectStatus("ready");
      setPublishReady(true);
      setPublishBlockMsg(undefined);
      setPreviewKey((k) => k + 1);
      router.refresh();
    };

    const id = window.setInterval(() => {
      void poll();
    }, 5_000);
    void poll();
    return () => window.clearInterval(id);
  }, [
    activePlanId,
    buildEnabled,
    developerMode,
    isGenerating,
    router,
  ]);

  const statusLabel = useMemo(() => {
    if (isGenerating) return "Gerando…";
    if (projectStatus === "published") return publishReady ? "Publicado" : "Publicado (desatualizado)";
    if (projectStatus === "ready") return "Pronto";
    return "Visualizando a última versão salva";
  }, [isGenerating, projectStatus, publishReady]);

  const publishButtonLabel = useMemo(() => {
    if (isGenerating) return "Gerando…";
    if (projectStatus === "published" && publishReady) return "Publicado";
    if (projectStatus === "published" && !publishReady) return "Publicar";
    if (projectStatus === "ready") return "Publicar";
    return "Publicar";
  }, [isGenerating, projectStatus, publishReady]);

  const tabs = useMemo(() => {
    const base: Array<[MainTab, string]> = [
      ["preview", "Pré-visualização"],
      ["code", "Código"],
      ["layers", "Camadas"],
    ];
    if (developerMode) base.push(["pipeline", "Pipeline"]);
    return base;
  }, [developerMode]);

  const presentPlanForApproval = useCallback(
    (next: { planId: string; plan: StudioPlan; model: string }) => {
      setActivePlanId(next.planId);
      setActivePlan(next.plan);
      setActiveModel(next.model);
      setIsGenerating(false);
      setBusy(false);
      setChatLog((prev) => [
        ...prev.filter((m) => !(m.kind === "ai" && m.working)),
        {
          kind: "ai",
          text: `Pronto. Vou criar: ${next.plan.summary.slice(0, 220)}`,
        },
        {
          kind: "plan",
          planId: next.planId,
          plan: next.plan,
        },
      ]);
    },
    [],
  );

  const approvePlan = useCallback((planItemId: string) => {
    setActivePlanId(planItemId);
    setIsGenerating(true);
    setProjectStatus("generating");
    setBuildFreshStart(true);
    setBuildToken((t) => t + 1);
    setBuildEnabled(true);
    setChatLog((prev) => [
      ...prev.map((m) =>
        m.kind === "plan" && m.planId === planItemId
          ? { ...m, approved: true }
          : m,
      ),
      {
        kind: "ai",
        working: true,
        text: "Ótimo! Estou construindo o preview do seu app…",
      },
    ]);
  }, []);

  const runPlanFromChat = useCallback(
    async (value: string) => {
      if (busy || planning) return;
      setBusy(true);
      setPlanning(true);
      setIsGenerating(true);
      setChatLog((prev) => [
        ...prev,
        { kind: "user", text: value },
        {
          kind: "ai",
          working: true,
          text: "Entendi. Estou analisando o melhor caminho…",
        },
      ]);
      setPrompt("");

      const result = await chatProjectAction(project.id, value);
      setPlanning(false);

      if (!result.ok) {
        setBusy(false);
        setIsGenerating(false);
        setChatLog((prev) => [
          ...prev.filter((m) => !(m.kind === "ai" && m.working)),
          {
            kind: "ai",
            text: `Não consegui montar agora: ${result.error}`,
          },
        ]);
        return;
      }

      if (result.intent === "ask") {
        setBusy(false);
        setIsGenerating(false);
        setActiveModel(result.model);
        setChatLog((prev) => [
          ...prev.filter((m) => !(m.kind === "ai" && m.working)),
          { kind: "ai", text: result.answer },
        ]);
        return;
      }

      if (result.intent === "edit") {
        setBusy(false);
        setIsGenerating(false);
        setProjectStatus("ready");
        setActiveModel(result.model);
        setPreviewKey((k) => k + 1);
        setChatLog((prev) => [
          ...prev.filter((m) => !(m.kind === "ai" && m.working)),
          {
            kind: "ai",
            text: `${result.summary}\n\nArquivos atualizados: ${result.paths.join(", ")}. O preview já foi atualizado.`,
          },
        ]);
        router.refresh();
        return;
      }

      if (result.intent === "resume_build") {
        setBusy(false);
        setActivePlanId(result.planId);
        setProjectStatus("generating");
        setBuildFreshStart(false);
        setBuildToken((t) => t + 1);
        setBuildEnabled(true);
        setIsGenerating(true);
        setChatLog((prev) => [
          ...prev.filter((m) => !(m.kind === "ai" && m.working)),
          {
            kind: "ai",
            working: true,
            text:
              result.recoveredTasks > 0
                ? `Retomando a geração (${result.pendingTasks} etapa(s) pendente(s); ${result.recoveredTasks} recuperada(s) após travamento).`
                : `Retomando a geração (${result.pendingTasks} etapa(s) pendente(s))…`,
          },
        ]);
        return;
      }

      // create → plano para OK
      presentPlanForApproval(result);
    },
    [busy, planning, presentPlanForApproval, project.id, router],
  );

  function openPublishPanel() {
    setPublishPanelOpen(true);
  }

  function handlePublished(url: string) {
    setPublishedUrl(url);
    setProjectStatus("published");
    setPublishReady(true);
    setPublishBlockMsg(undefined);
    setChatLog((prev) => [
      ...prev,
      {
        kind: "ai",
        text: "Publicado! Seu site está no ar — copie o link no painel acima.",
      },
    ]);
  }

  function sendChat() {
    const value = prompt.trim();
    if (!value) return;
    void runPlanFromChat(value);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#F7F7F8]">
      <AutoPlanBootstrap
        projectId={project.id}
        prompt={initialPrompt || ""}
        enabled={autoStart && !planId}
        hasPlan={Boolean(activePlanId)}
        onStarted={() => {
          setIsGenerating(true);
          setBusy(true);
          setChatLog((prev) => [
            ...prev.filter((m) => !(m.kind === "ai" && m.working)),
            {
              kind: "ai",
              working: true,
              text: "Entendi seu pedido. Estou preparando a estrutura do app…",
            },
          ]);
        }}
        onReady={(next) => {
          if (awaitApproval) {
            presentPlanForApproval(next);
          } else {
            setActivePlanId(next.planId);
            setActivePlan(next.plan);
            setActiveModel(next.model);
            setBuildFreshStart(true);
            setBuildToken((t) => t + 1);
            setBuildEnabled(true);
            setChatLog((prev) => [
              ...prev.filter((m) => !(m.kind === "ai" && m.working)),
              {
                kind: "ai",
                working: true,
                text: "Plano pronto. Construindo o preview…",
              },
            ]);
          }
        }}
        onError={(message) => {
          setBusy(false);
          setIsGenerating(false);
          setChatLog((prev) => [
            ...prev.filter((m) => !(m.kind === "ai" && m.working)),
            {
              kind: "ai",
              text: `Não consegui montar agora: ${message}`,
            },
          ]);
        }}
      />

      <SilentBuildRunner
        planId={activePlanId}
        enabled={buildEnabled && !developerMode}
        freshStart={buildFreshStart}
        runToken={buildToken}
        onProgress={(message) => {
          setChatLog((prev) => {
            const withoutWorking = prev.filter(
              (m) => !(m.kind === "ai" && m.working),
            );
            return [
              ...withoutWorking,
              { kind: "ai", working: true, text: message },
            ];
          });
        }}
        onPreviewUpdate={() => setPreviewKey((k) => k + 1)}
        onSuccess={() => {
          setBusy(false);
          setIsGenerating(false);
          setBuildEnabled(false);
          setBuildFreshStart(false);
          setProjectStatus("ready");
          setPublishReady(true);
          setPublishBlockMsg(undefined);
          setPreviewKey((k) => k + 1);
          setVerifyToken((t) => t + 1);
          setChatLog((prev) => [
            ...prev.filter((m) => !(m.kind === "ai" && m.working)),
            {
              kind: "ai",
              text: "Pronto! Seu app já está no preview. Peça ajustes pelo chat quando quiser.",
            },
          ]);
          router.refresh();
        }}
        onError={(message) => {
          setBusy(false);
          setIsGenerating(false);
          setBuildEnabled(false);
          setBuildFreshStart(false);
          setProjectStatus("error");
          setChatLog((prev) => [
            ...prev.filter((m) => !(m.kind === "ai" && m.working)),
            {
              kind: "ai",
              text: `Algo deu errado na geração: ${message}`,
            },
          ]);
        }}
      />

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
          {tabs.map(([id, label]) => (
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
          <Link
            href={`/projects/${project.id}/settings`}
            className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100"
            title="Configurações da empresa"
          >
            Configurações
          </Link>
          <button
            type="button"
            onClick={() => setPreviewKey((k) => k + 1)}
            className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100"
          >
            Atualizar preview
          </button>
          <button
            type="button"
            onClick={() => {
              setDeveloperMode((v) => {
                const next = !v;
                if (!next && mainTab === "pipeline") setMainTab("preview");
                return next;
              });
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              developerMode
                ? "bg-orange-100 text-orange-800"
                : "bg-zinc-100 text-zinc-600"
            }`}
            title="Ferramentas avançadas"
          >
            Dev
          </button>
          <div className="relative">
            <button
              type="button"
              data-publish-trigger
              onClick={openPublishPanel}
              className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
              title={publishedUrl ?? "Publicar site"}
            >
              {publishButtonLabel}
            </button>
            <PublishPanel
              open={publishPanelOpen}
              onClose={() => setPublishPanelOpen(false)}
              projectId={project.id}
              projectSlug={project.slug}
              initialUrl={publishedUrl}
              isPublished={projectStatus === "published" && publishReady}
              canPublish={publishReady}
              publishBlockReason={publishBlockMsg}
              onPublished={handlePublished}
            />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-full max-w-[380px] shrink-0 flex-col border-r border-zinc-200 bg-white md:w-[32%]">
          <div className="border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-900">Chat X09</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              IA: {activeModel ?? "X09 Router"}
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {chatLog.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-zinc-400">
                Descreva o que quer criar ou alterar.
              </p>
            ) : (
              chatLog.map((msg, index) => {
                if (msg.kind === "user") {
                  return (
                    <div key={`u-${index}`} className="flex justify-end">
                      <div className="max-w-[90%] rounded-2xl bg-zinc-900 px-3.5 py-2.5 text-sm leading-6 text-white">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                if (msg.kind === "plan") {
                  return (
                    <div key={`p-${msg.planId}`} className="flex justify-start">
                      <div className="max-w-[95%] rounded-2xl bg-violet-50 px-3.5 py-3 text-sm leading-6 text-zinc-800 ring-1 ring-violet-100">
                        <p className="font-semibold text-zinc-900">
                          Resumo do app
                        </p>
                        <p className="mt-1 text-zinc-700">
                          {msg.plan.summary}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                          Páginas: {plainPlanBlurb(msg.plan)}
                        </p>
                        {msg.approved ? (
                          <p className="mt-3 text-xs font-medium text-violet-700">
                            Aprovado — gerando…
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => approvePlan(msg.planId)}
                            className="mt-3 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700"
                          >
                            OK, construir app
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={`a-${index}`} className="flex justify-start">
                    <div className="max-w-[90%] rounded-2xl bg-zinc-50 px-3.5 py-2.5 text-sm leading-6 text-zinc-800 ring-1 ring-zinc-100">
                      {msg.text}
                      {msg.working ? (
                        <span className="mt-2 block text-xs text-violet-600">
                          Trabalhando…
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-zinc-100 p-3">
            <div className="rounded-[22px] border border-zinc-200 bg-white p-2 shadow-sm">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Pergunte ao X09…"
                rows={2}
                disabled={busy || planning}
                className="w-full resize-none border-0 bg-transparent px-2 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-60"
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
                  disabled={busy || planning || !prompt.trim()}
                  className="rounded-full bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  Construir
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section className="relative min-w-0 flex-1 overflow-hidden bg-zinc-100">
          {mainTab === "preview" ? (
            <ProjectLivePreview
              projectId={project.id}
              refreshKey={previewKey}
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

          {developerMode ? (
            <div
              className={`absolute inset-0 space-y-4 overflow-y-auto bg-[#F7F7F8] p-4 ${
                mainTab === "pipeline" ? "block" : "hidden"
              }`}
            >
              <PlannerPanel
                projectId={project.id}
                initialPrompt={initialPrompt}
                initialPlan={activePlan}
                initialModel={activeModel}
              />
              <BuilderPanel
                planId={activePlanId}
                projectId={project.id}
                autoStart={false}
                onBuildSuccess={() => {
                  setIsGenerating(false);
                  setProjectStatus("ready");
                  setVerifyToken((t) => t + 1);
                  setPreviewKey((k) => k + 1);
                  router.refresh();
                }}
              />
              <VerifyPanel
                projectId={project.id}
                planId={activePlanId}
                autoStartToken={verifyToken}
                onVerifyComplete={(state) => {
                  setLastVerifyReportId(state.reportId);
                  setFixToken((t) => t + 1);
                }}
              />
              <FixPanel
                projectId={project.id}
                planId={activePlanId}
                verifyReportId={lastVerifyReportId}
                autoStartToken={fixToken}
              />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
