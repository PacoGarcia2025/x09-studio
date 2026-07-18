import { create } from "zustand";
import {
  PHASE_LABELS,
  resolveGenerationMode,
  streamAIResponse,
  type AgentPhase,
  type GenerationEvent,
  type GenerationPreference,
  type RepairIssue,
  type ResolvedMode,
} from "@/lib/api";
import { stripCodeFencesForChat } from "@/lib/chat-display";
import { parseAIResponse } from "@/lib/parser";
import { sanitizeSandpackCode } from "@/components/workspace/sandpack-files";

export type ChatMessage = {
  id: string;
  role: "user" | "ai";
  content: string;
};

export type StudioVersion = {
  id: string;
  prompt: string;
  timestamp: number;
  files: Record<string, string>;
};

export type GenerationMetrics = {
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  repairCycles: number;
  model?: string;
  firstBuildOk?: boolean;
};

const MAX_REPAIR_CYCLES = 3;

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "ai",
  content:
    "Olá! Eu sou o X09 — agora com pipeline agente (planejar → construir → verificar → corrigir). Descreva o app ou landing que você quer.",
};

type StudioState = {
  messages: ChatMessage[];
  isGenerating: boolean;
  agentPhase: AgentPhase | null;
  agentPhaseLabel: string | null;
  generationPreference: GenerationPreference;
  lastResolvedMode: ResolvedMode | null;
  lastAppSpec: unknown | null;
  previewError: RepairIssue | null;
  repairCycles: number;
  metrics: GenerationMetrics | null;
  lastStableFiles: Record<string, string> | null;
  files: Record<string, string>;
  activeFile: string;
  versions: StudioVersion[];
  activeVersionId: string | null;
  abortController: AbortController | null;
  addMessage: (message: ChatMessage) => void;
  setGenerationPreference: (preference: GenerationPreference) => void;
  setPreviewError: (issue: RepairIssue | null) => void;
  sendMessage: (prompt: string) => Promise<void>;
  stopGeneration: () => void;
  requestRepair: (issues: RepairIssue[]) => Promise<void>;
  updateFile: (path: string, content: string) => void;
  setActiveFile: (path: string) => void;
  revertToVersion: (versionId: string) => void;
  resetProject: () => void;
  hydrateProject: (payload: {
    files: Record<string, string>;
    messages: ChatMessage[];
  }) => void;
};

const initialApp = `import { DESIGN_TOKENS } from "./design-tokens";
import { AppShell, Button, Card, Section } from "./components/ui";

export default function App() {
  return (
    <AppShell brand="studio.x09" cta="Começar">
      <Section
        eyebrow="X09 Agent"
        title="Pronto para construir apps completos"
        subtitle="Descreva sua ideia no chat — eu planejo, gero multi-arquivo, verifico e corrijo automaticamente."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-sm font-medium text-white">Planejar</p>
            <p className={DESIGN_TOKENS.typography.body}>Spec de produto e páginas.</p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-white">Construir</p>
            <p className={DESIGN_TOKENS.typography.body}>Kit visual + mocks de dados.</p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-white">Corrigir</p>
            <p className={DESIGN_TOKENS.typography.body}>Auto-repair até 3 ciclos.</p>
          </Card>
        </div>
        <div className="mt-8">
          <Button>Peça no chat ao lado</Button>
        </div>
      </Section>
    </AppShell>
  );
}
`;

const initialPackageJson = `{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {}
}
`;

function applyParsedFiles(
  stateFiles: Record<string, string>,
  finalText: string,
): { nextFiles: Record<string, string>; paths: string[] } {
  const parsedFiles = parseAIResponse(finalText);
  const paths = Object.keys(parsedFiles).filter(
    (p) => !p.startsWith("/components/ui/") && p !== "/design-tokens.ts",
  );

  const sanitizedParsed = Object.fromEntries(
    Object.entries(parsedFiles)
      .filter(([path]) => !path.startsWith("/components/ui/"))
      .map(([path, fileContent]) => [path, sanitizeSandpackCode(fileContent)]),
  );

  const nextFiles =
    paths.length > 0 ? { ...stateFiles, ...sanitizedParsed } : stateFiles;

  return { nextFiles, paths };
}

export const useStudioStore = create<StudioState>((set, get) => ({
  messages: [welcomeMessage],
  isGenerating: false,
  agentPhase: null,
  agentPhaseLabel: null,
  generationPreference: "auto",
  lastResolvedMode: null,
  lastAppSpec: null,
  previewError: null,
  repairCycles: 0,
  metrics: null,
  lastStableFiles: null,
  files: {
    "/App.tsx": initialApp,
    "/package.json": initialPackageJson,
  },
  activeFile: "/App.tsx",
  versions: [],
  activeVersionId: null,
  abortController: null,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setGenerationPreference: (preference) =>
    set({ generationPreference: preference }),

  setPreviewError: (issue) => set({ previewError: issue }),

  stopGeneration: () => {
    get().abortController?.abort();
    set({
      isGenerating: false,
      agentPhase: "erro",
      agentPhaseLabel: "Geração cancelada",
      abortController: null,
    });
  },

  sendMessage: async (prompt) => {
    const content = prompt.trim();
    if (!content || get().isGenerating) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    const aiMessageId = crypto.randomUUID();
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: "ai",
      content: "",
    };

    const abortController = new AbortController();

    set((state) => ({
      messages: [...state.messages, userMessage, aiMessage],
      isGenerating: true,
      agentPhase: "planejando",
      agentPhaseLabel: PHASE_LABELS.planejando,
      previewError: null,
      repairCycles: 0,
      abortController,
      lastStableFiles: { ...state.files },
      versions:
        state.versions.length === 0
          ? [
              {
                id: "initial",
                prompt: "Estado inicial",
                timestamp: Date.now(),
                files: { ...state.files },
              },
            ]
          : state.versions,
    }));

    const history = get()
      .messages.filter((message) => message.id !== aiMessageId)
      .map((message) => ({
        role: message.role,
        content:
          message.role === "ai"
            ? stripCodeFencesForChat(message.content) ||
              "Atualizei a interface no Preview."
            : message.content,
      }));

    const currentApp = get().files["/App.tsx"] ?? "";
    const hasExistingApp =
      get().versions.some((v) => v.id !== "initial") ||
      currentApp.trim() !== initialApp.trim();

    const preference = get().generationPreference;
    set({
      lastResolvedMode: resolveGenerationMode(content, {
        preference,
        hasExistingApp,
      }),
    });

    const handleEvent = (event: GenerationEvent) => {
      if (event.type === "phase") {
        set({ agentPhase: event.phase, agentPhaseLabel: event.label });
      } else if (event.type === "mode") {
        set({ lastResolvedMode: event.mode, metrics: {
          ...(get().metrics ?? { repairCycles: 0 }),
          model: event.model,
          repairCycles: get().repairCycles,
        }});
      } else if (event.type === "spec") {
        set({ lastAppSpec: event.spec });
      } else if (event.type === "metrics") {
        set({
          metrics: {
            repairCycles: get().repairCycles,
            inputTokens: event.inputTokens,
            outputTokens: event.outputTokens,
            latencyMs: event.latencyMs,
            model: get().metrics?.model,
          },
        });
      }
    };

    try {
      const resolved = await streamAIResponse(
        (accumulated) => {
          const prose = stripCodeFencesForChat(accumulated);
          const phase = get().agentPhase;
          const label =
            prose ||
            get().agentPhaseLabel ||
            (phase ? PHASE_LABELS[phase] : "Gerando…");
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === aiMessageId
                ? { ...message, content: label }
                : message,
            ),
          }));
        },
        (finalText) => {
          const { nextFiles, paths } = applyParsedFiles(get().files, finalText);
          const generatedVersionId = crypto.randomUUID();
          const proseBase = stripCodeFencesForChat(finalText);
          const noCodeApplied = paths.length === 0;
          const prose = noCodeApplied
            ? "Não consegui aplicar a alteração no código (resposta sem bloco path=). Tente de novo — ex.: \"mude o fundo da hero para degradê preto e laranja\"."
            : proseBase ||
              "Pronto. Confira o Preview — estou verificando erros automaticamente.";

          set((state) => ({
            files: nextFiles,
            activeFile: paths.includes("/App.tsx")
              ? "/App.tsx"
              : paths[paths.length - 1] ?? state.activeFile,
            isGenerating: false,
            agentPhase: noCodeApplied ? "erro" : "verificando",
            agentPhaseLabel: noCodeApplied
              ? "Edição sem código — nada mudou no Preview"
              : "Verificando Preview…",
            abortController: null,
            messages: state.messages.map((message) =>
              message.id === aiMessageId ? { ...message, content: prose } : message,
            ),
            versions: noCodeApplied
              ? state.versions
              : [
                  ...state.versions,
                  {
                    id: generatedVersionId,
                    prompt: content.slice(0, 60),
                    timestamp: Date.now(),
                    files: { ...nextFiles },
                  },
                ],
            activeVersionId: noCodeApplied
              ? state.activeVersionId
              : generatedVersionId,
            lastStableFiles: noCodeApplied
              ? state.lastStableFiles
              : { ...nextFiles },
            metrics: {
              ...(state.metrics ?? { repairCycles: 0 }),
              firstBuildOk: !noCodeApplied,
              repairCycles: state.repairCycles,
            },
          }));
        },
        history,
        {
          preference,
          hasExistingApp,
          currentAppCode: currentApp,
          currentFiles: get().files,
          phase: "auto",
          appSpec: get().lastAppSpec ?? undefined,
          signal: abortController.signal,
          onEvent: handleEvent,
        },
      );

      set({ lastResolvedMode: resolved });
    } catch (error) {
      const errorText =
        error instanceof Error
          ? `Erro ao gerar resposta: ${error.message}`
          : "Erro ao gerar resposta.";
      set((state) => ({
        isGenerating: false,
        agentPhase: "erro",
        agentPhaseLabel: errorText,
        abortController: null,
        messages: state.messages.map((message) =>
          message.id === aiMessageId
            ? { ...message, content: errorText }
            : message,
        ),
      }));
    }
  },

  requestRepair: async (issues) => {
    const state = get();
    if (state.isGenerating) return;
    if (!issues.length) return;
    if (state.repairCycles >= MAX_REPAIR_CYCLES) {
      set({
        agentPhase: "erro",
        agentPhaseLabel: `Não consegui corrigir após ${MAX_REPAIR_CYCLES} tentativas.`,
        metrics: {
          ...(state.metrics ?? { repairCycles: state.repairCycles }),
          firstBuildOk: false,
        },
      });
      return;
    }

    // Evita repair em estado inicial sem geração
    if (!state.versions.some((v) => v.id !== "initial")) return;

    const cycle = state.repairCycles + 1;
    const abortController = new AbortController();
    const aiMessageId = crypto.randomUUID();

    set({
      isGenerating: true,
      repairCycles: cycle,
      agentPhase: "corrigindo",
      agentPhaseLabel: `Corrigindo automaticamente (${cycle}/${MAX_REPAIR_CYCLES})…`,
      abortController,
      messages: [
        ...state.messages,
        {
          id: aiMessageId,
          role: "ai",
          content: `Encontrei um erro no Preview. Corrigindo (${cycle}/${MAX_REPAIR_CYCLES})…`,
        },
      ],
    });

    try {
      await streamAIResponse(
        (accumulated) => {
          const prose =
            stripCodeFencesForChat(accumulated) ||
            `Corrigindo (${cycle}/${MAX_REPAIR_CYCLES})…`;
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === aiMessageId ? { ...m, content: prose } : m,
            ),
          }));
        },
        (finalText) => {
          const { nextFiles, paths } = applyParsedFiles(get().files, finalText);
          set((s) => ({
            files: nextFiles,
            activeFile: paths[0] ?? s.activeFile,
            isGenerating: false,
            agentPhase: "verificando",
            agentPhaseLabel: "Reverificando Preview…",
            abortController: null,
            previewError: null,
            messages: s.messages.map((m) =>
              m.id === aiMessageId
                ? {
                    ...m,
                    content:
                      stripCodeFencesForChat(finalText) ||
                      "Apliquei a correção. Verificando novamente…",
                  }
                : m,
            ),
            versions: [
              ...s.versions,
              {
                id: crypto.randomUUID(),
                prompt: `auto-repair #${cycle}`,
                timestamp: Date.now(),
                files: { ...nextFiles },
              },
            ],
            metrics: {
              ...(s.metrics ?? { repairCycles: cycle }),
              repairCycles: cycle,
            },
          }));
        },
        [
          {
            role: "user",
            content:
              "Corrija os erros do Preview listados. Devolva apenas os arquivos necessários.",
          },
        ],
        {
          preference: "premium",
          hasExistingApp: true,
          currentAppCode: get().files["/App.tsx"],
          currentFiles: get().files,
          phase: "repair",
          repairIssues: issues,
          signal: abortController.signal,
          onEvent: (event) => {
            if (event.type === "phase") {
              set({ agentPhase: event.phase, agentPhaseLabel: event.label });
            }
          },
        },
      );
    } catch (error) {
      // rollback para última versão estável
      const stable = get().lastStableFiles;
      set({
        isGenerating: false,
        abortController: null,
        agentPhase: "erro",
        agentPhaseLabel:
          error instanceof Error ? error.message : "Falha no auto-repair",
        files: stable ?? get().files,
      });
    }
  },

  updateFile: (path, content) =>
    set((state) => ({
      files: {
        ...state.files,
        [path]: content,
      },
    })),

  setActiveFile: (path) => set({ activeFile: path }),

  revertToVersion: (versionId) =>
    set((state) => {
      const version = state.versions.find((item) => item.id === versionId);
      if (!version) return state;

      return {
        files: { ...version.files },
        activeFile: version.files[state.activeFile]
          ? state.activeFile
          : "/App.tsx",
        activeVersionId: version.id,
      };
    }),

  resetProject: () => {
    get().abortController?.abort();
    set({
      messages: [{ ...welcomeMessage, id: crypto.randomUUID() }],
      isGenerating: false,
      agentPhase: null,
      agentPhaseLabel: null,
      lastResolvedMode: null,
      lastAppSpec: null,
      previewError: null,
      repairCycles: 0,
      metrics: null,
      lastStableFiles: null,
      abortController: null,
      files: {
        "/App.tsx": initialApp,
        "/package.json": initialPackageJson,
      },
      activeFile: "/App.tsx",
      versions: [],
      activeVersionId: null,
    });
  },

  hydrateProject: ({ files, messages }) => {
    const filePaths = Object.keys(files);
    set({
      files: { ...files },
      messages:
        messages.length > 0
          ? messages
          : [{ ...welcomeMessage, id: crypto.randomUUID() }],
      activeFile: filePaths.includes("/App.tsx")
        ? "/App.tsx"
        : filePaths[0] ?? "/App.tsx",
      versions: [],
      activeVersionId: null,
      isGenerating: false,
      lastResolvedMode: null,
      agentPhase: null,
      agentPhaseLabel: null,
      lastAppSpec: null,
      previewError: null,
      repairCycles: 0,
      metrics: null,
      lastStableFiles: { ...files },
      abortController: null,
    });
  },
}));
