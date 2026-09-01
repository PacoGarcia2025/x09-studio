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
import {
  homeReadyChatMessage,
  needsAuthPanel,
} from "@/lib/pipeline/build-phases";
import { getBuildState, tickBuildAction } from "@/lib/pipeline/builder.actions";
import type { StudioPlan } from "@/lib/pipeline/plan-schema";
import { PublishPanel } from "@/components/projects/PublishPanel";
import { resolvePublicShareUrl } from "@/lib/projects/publish-url";
import {
  BuildProgressBubble,
  humanizeBuildError,
} from "@/components/projects/BuildProgressBubble";

type MainTab = "preview" | "code" | "layers" | "pipeline";

type ChatItem =
  | { kind: "user"; text: string }
  | { kind: "ai"; text: string }
  | { kind: "building" }
  | {
      kind: "plan";
      planId: string;
      plan: StudioPlan;
      approved?: boolean;
    };

function stripBuildingMessages(items: ChatItem[]): ChatItem[] {
  return items.filter((m) => m.kind !== "building");
}

function appendBuildingBubble(items: ChatItem[]): ChatItem[] {
  return [...stripBuildingMessages(items), { kind: "building" }];
}

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
  const finalizePollRef = useRef(false);
  const briefText = useMemo(
    () => initialPrompt?.trim() ?? "",
    [initialPrompt],
  );

  const handleHomeReady = useCallback(() => {
    setBusy(false);
    setIsGenerating(false);
    setBuildEnabled(false);
    setBuildFreshStart(false);
    setProjectStatus("ready");
    setPublishReady(true);
    setPublishBlockMsg(undefined);
    setPreviewKey((k) => k + 1);
    setMainTab("preview");
    const authPanel = needsAuthPanel(briefText);
    const msg = homeReadyChatMessage(briefText, authPanel);
    setChatLog((prev) => {
      const cleaned = stripBuildingMessages(prev);
      const marker = authPanel
        ? "página principal está pronta"
        : "landing está no ar";
      if (
        cleaned.some(
          (m) => m.kind === "ai" && m.text.includes(marker),
        )
      ) {
        return cleaned;
      }
      return [...cleaned, { kind: "ai", text: msg }];
    });
    router.refresh();
  }, [briefText, router]);

  const handleBuildSuccess = useCallback(() => {
    setBusy(false);
    setIsGenerating(false);
    setBuildEnabled(false);
    setBuildFreshStart(false);
    setProjectStatus("ready");
    setPublishReady(true);
    setPublishBlockMsg(undefined);
    setPreviewKey((k) => k + 1);
    setVerifyToken((t) => t + 1);
    setChatLog((prev) => {
      const cleaned = stripBuildingMessages(prev);
      if (
        cleaned.some(
          (m) =>
            m.kind === "ai" &&
            m.text.includes("Pronto! Seu app já está no preview"),
        )
      ) {
        return cleaned;
      }
      return [
        ...cleaned,
        {
          kind: "ai",
          text: "Pronto! Seu app já está no preview. Peça ajustes pelo chat quando quiser.",
        },
      ];
    });
    router.refresh();
  }, [router]);

  const finalizeBuildComplete = useCallback(
    async (planId: string | null, homePhaseOnly?: boolean) => {
      if (homePhaseOnly === true) {
        handleHomeReady();
        return;
      }
      if (homePhaseOnly === false) {
        handleBuildSuccess();
        return;
      }
      if (!planId) {
        handleBuildSuccess();
        return;
      }
      const state = await getBuildState(planId);
      if (state.ok && state.data.counts.skipped > 0) {
        handleHomeReady();
      } else {
        handleBuildSuccess();
      }
    },
    [handleBuildSuccess, handleHomeReady],
  );

  const handleBuildError = useCallback((message: string) => {
    setBusy(false);
    setIsGenerating(false);
    setBuildEnabled(false);
    setBuildFreshStart(false);
    setProjectStatus("error");
    setPreviewKey((k) => k + 1);
    setChatLog((prev) => [
      ...stripBuildingMessages(prev),
      {
        kind: "ai",
        text: humanizeBuildError(message),
      },
    ]);
    router.refresh();
  }, [router]);

  useEffect(() => {
    finalizePollRef.current = false;
  }, [buildToken, activePlanId]);

  useEffect(() => {
    if (project.status === "ready" && isGenerating) {
      void finalizeBuildComplete(activePlanId);
    } else if (project.status === "error" && isGenerating) {
      setIsGenerating(false);
      setBusy(false);
      setBuildEnabled(false);
      setProjectStatus("error");
      setPreviewKey((k) => k + 1);
    }
  }, [activePlanId, finalizeBuildComplete, isGenerating, project.status]);

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
    if (!activePlanId || !isGenerating || developerMode) return;

    const poll = async () => {
      const result = await getBuildState(activePlanId);
      if (!result.ok) return;

      const { counts, planStatus, projectStatus: remoteProjectStatus } =
        result.data;

      if (remoteProjectStatus === "ready") {
        await finalizeBuildComplete(activePlanId);
        return;
      }

      if (remoteProjectStatus === "error") {
        handleBuildError("A geração encontrou um problema. Tente de novo pelo chat.");
        return;
      }

      if (counts.done > lastDoneTasksRef.current) {
        lastDoneTasksRef.current = counts.done;
        setPreviewKey((k) => k + 1);
      }

      const tasksFinished =
        counts.total > 0 &&
        counts.queued === 0 &&
        counts.running === 0 &&
        counts.retrying === 0 &&
        counts.done + counts.failed + counts.skipped === counts.total;

      if (!tasksFinished && planStatus !== "built") return;

      if (counts.failed > 0) {
        handleBuildError("Algumas etapas falharam durante a geração.");
        return;
      }

      if (finalizePollRef.current) return;
      finalizePollRef.current = true;

      const tick = await tickBuildAction(activePlanId);
      if (!tick.ok) {
        finalizePollRef.current = false;
        return;
      }

      if (tick.done) {
        if (tick.failed) {
          handleBuildError(tick.message);
        } else if (tick.homePhaseOnly) {
          handleHomeReady();
        } else {
          handleBuildSuccess();
        }
        return;
      }

      finalizePollRef.current = false;
    };

    const id = window.setInterval(() => {
      void poll();
    }, 4_000);
    void poll();
    return () => window.clearInterval(id);
  }, [
    activePlanId,
    developerMode,
    handleBuildError,
    handleBuildSuccess,
    handleHomeReady,
    finalizeBuildComplete,
    isGenerating,
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
        ...stripBuildingMessages(prev),
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
      { kind: "building" },
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
        { kind: "building" },
      ]);
      setPrompt("");

      const result = await chatProjectAction(project.id, value);
      setPlanning(false);

      if (!result.ok) {
        setBusy(false);
        setIsGenerating(false);
        setChatLog((prev) => [
          ...stripBuildingMessages(prev),
          {
            kind: "ai",
            text: `Não consegui montar agora: ${humanizeBuildError(result.error)}`,
          },
        ]);
        return;
      }

      if (result.intent === "ask") {
        setBusy(false);
        setIsGenerating(false);
        setActiveModel(result.model);
        setChatLog((prev) => [
          ...stripBuildingMessages(prev),
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
          ...stripBuildingMessages(prev),
          {
            kind: "ai",
            text: `${result.summary}\n\nPronto — suas alterações já estão no preview.`,
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
        setChatLog((prev) => appendBuildingBubble(prev));
        return;
      }

      if (result.intent === "continue_full_build") {
        setBusy(false);
        setActivePlanId(result.planId);
        setProjectStatus("generating");
        setBuildFreshStart(false);
        setBuildToken((t) => t + 1);
        setBuildEnabled(true);
        setIsGenerating(true);
        setChatLog((prev) =>
          appendBuildingBubble([
            ...stripBuildingMessages(prev),
            {
              kind: "ai",
              text: "Perfeito — vou criar login e painel agora. Acompanhe no preview.",
            },
          ]),
        );
        return;
      }

      // create → plano para OK
      setBusy(false);
      setIsGenerating(false);
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
    <div className="fixed inset-0 z-40 flex flex-col bg-[#03040a] text-zinc-100">
      <AutoPlanBootstrap
        projectId={project.id}
        prompt={initialPrompt || ""}
        enabled={autoStart && !planId}
        hasPlan={Boolean(activePlanId)}
        onStarted={() => {
          setIsGenerating(true);
          setBusy(true);
          setChatLog((prev) => appendBuildingBubble(prev));
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
            setChatLog((prev) => appendBuildingBubble(prev));
          }
        }}
        onError={(message) => {
          setBusy(false);
          setIsGenerating(false);
          setChatLog((prev) => [
            ...stripBuildingMessages(prev),
            {
              kind: "ai",
              text: `Não consegui montar agora: ${humanizeBuildError(message)}`,
            },
          ]);
        }}
      />

      <SilentBuildRunner
        planId={activePlanId}
        enabled={buildEnabled && !developerMode}
        freshStart={buildFreshStart}
        runToken={buildToken}
        onBuilding={() => {
          setChatLog((prev) => appendBuildingBubble(prev));
        }}
        onPreviewUpdate={() => setPreviewKey((k) => k + 1)}
        onHomeReady={handleHomeReady}
        onSuccess={handleBuildSuccess}
        onError={handleBuildError}
      />

      <header className="relative z-50 flex h-12 shrink-0 items-center gap-2 border-b border-white/8 bg-black/40 px-3 backdrop-blur-xl">
        <Link
          href="/projects"
          className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-100"
          title="Voltar"
        >
          ←
        </Link>
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/20 text-[9px] font-bold text-violet-100 ring-1 ring-violet-400/30">
          X09
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {project.name}
          </p>
          <p className="truncate text-[11px] text-zinc-500">{statusLabel}</p>
        </div>

        <div className="mx-auto hidden h-9 items-center gap-0.5 rounded-full border border-white/8 bg-white/[0.04] p-1 sm:flex">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMainTab(id)}
              className={`h-7 rounded-full px-3 text-xs font-medium transition ${
                mainTab === id
                  ? "bg-violet-500/25 text-white ring-1 ring-violet-400/30"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href={`/projects/${project.id}/settings`}
            className="rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
            title="Configurações da empresa"
          >
            Configurações
          </Link>
          <button
            type="button"
            onClick={() => setPreviewKey((k) => k + 1)}
            className="rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
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
                ? "bg-orange-500/20 text-orange-200 ring-1 ring-orange-400/30"
                : "bg-white/[0.06] text-zinc-400"
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
              className="x09-button-primary px-3 py-1.5 text-xs"
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
        <aside className="flex w-full max-w-[380px] shrink-0 flex-col border-r border-white/8 bg-black/35 backdrop-blur-xl md:w-[32%]">
          <div className="border-b border-white/8 px-4 py-3">
            <p className="text-sm font-semibold text-white">Chat X09</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              IA: {activeModel ?? "X09 Router"}
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {chatLog.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-zinc-500">
                Descreva o que quer criar ou alterar.
              </p>
            ) : (
              chatLog.map((msg, index) => {
                if (msg.kind === "user") {
                  return (
                    <div key={`u-${index}`} className="flex justify-end">
                      <div className="max-w-[90%] rounded-2xl bg-violet-500/25 px-3.5 py-2.5 text-sm leading-6 text-violet-50 ring-1 ring-violet-400/25">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                if (msg.kind === "building") {
                  return (
                    <div key={`b-${index}`} className="flex justify-start">
                      <BuildProgressBubble />
                    </div>
                  );
                }

                if (msg.kind === "plan") {
                  return (
                    <div key={`p-${msg.planId}`} className="flex justify-start">
                      <div className="max-w-[95%] rounded-2xl border border-violet-400/20 bg-violet-500/10 px-3.5 py-3 text-sm leading-6 text-zinc-200">
                        <p className="font-semibold text-white">
                          Resumo do app
                        </p>
                        <p className="mt-1 text-zinc-300">
                          {msg.plan.summary}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                          Páginas: {plainPlanBlurb(msg.plan)}
                        </p>
                        {msg.approved ? (
                          <div className="mt-3">
                            <BuildProgressBubble />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => approvePlan(msg.planId)}
                            className="x09-button-primary mt-3 px-4 py-2 text-xs"
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
                    <div className="max-w-[90%] rounded-2xl border border-white/8 bg-white/[0.04] px-3.5 py-2.5 text-sm leading-6 text-zinc-200">
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-white/8 p-3">
            <div className="x09-hero-prompt rounded-[22px] p-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Pergunte ao X09…"
                rows={2}
                disabled={busy || planning}
                className="x09-hero-prompt-input w-full resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none disabled:opacity-60"
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
                  className="x09-button-primary px-3.5 py-2 text-xs disabled:opacity-50"
                >
                  Construir
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-[#08060f]">
          {mainTab === "preview" ? (
            <ProjectLivePreview
              projectId={project.id}
              refreshKey={previewKey}
              isBuilding={isGenerating && projectStatus !== "ready"}
            />
          ) : null}

          {mainTab === "code" ? (
            <div className="absolute inset-0 overflow-auto bg-[#08060f] p-4">
              <ProjectFilesPanel projectId={project.id} />
            </div>
          ) : null}

          {mainTab === "layers" ? (
            <div className="absolute inset-0 grid place-items-center bg-[#08060f]">
              <p className="text-sm text-zinc-500">
                Camadas / Visual Edits em breve
              </p>
            </div>
          ) : null}

          {developerMode ? (
            <div
              className={`absolute inset-0 space-y-4 overflow-y-auto bg-[#08060f] p-4 ${
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
