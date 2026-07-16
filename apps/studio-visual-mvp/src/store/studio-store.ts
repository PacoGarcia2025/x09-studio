import { create } from "zustand";
import { streamAIResponse } from "@/lib/api";
import { stripCodeFencesForChat } from "@/lib/chat-display";
import { parseAIResponse } from "@/lib/parser";

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

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "ai",
  content:
    "Olá! Eu sou o X09. Descreva o produto ou landing page que você quer — eu entrego uma interface premium (gradientes, ícones, animações) toda em português do Brasil.",
};

type StudioState = {
  messages: ChatMessage[];
  isGenerating: boolean;
  files: Record<string, string>;
  activeFile: string;
  versions: StudioVersion[];
  activeVersionId: string | null;
  addMessage: (message: ChatMessage) => void;
  sendMessage: (prompt: string) => Promise<void>;
  updateFile: (path: string, content: string) => void;
  setActiveFile: (path: string) => void;
  revertToVersion: (versionId: string) => void;
  resetProject: () => void;
  hydrateProject: (payload: {
    files: Record<string, string>;
    messages: ChatMessage[];
  }) => void;
};

const initialApp = `export default function App() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#06030d] px-6 text-center text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(122,60,255,0.35),_transparent_55%)]" />
      <div className="relative z-10 max-w-2xl space-y-4">
        <p className="text-sm uppercase tracking-[0.35em] text-violet-300">studio.x09</p>
        <h1 className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
          Pronto para construir algo extraordinário
        </h1>
        <p className="text-base text-white/70 md:text-lg">
          Descreva sua ideia no chat e eu gero uma experiência visual de nível agência.
        </p>
      </div>
    </div>
  );
}
`;

const initialPackageJson = `{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "react": "latest",
    "react-dom": "latest",
    "tailwindcss": "latest"
  },
  "devDependencies": {}
}
`;

export const useStudioStore = create<StudioState>((set, get) => ({
  messages: [welcomeMessage],
  isGenerating: false,
  files: {
    "/App.tsx": initialApp,
    "/package.json": initialPackageJson,
  },
  activeFile: "/App.tsx",
  versions: [],
  activeVersionId: null,
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
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

    // Passo A + B: mensagem do usuário + bolha vazia da IA
    set((state) => ({
      messages: [...state.messages, userMessage, aiMessage],
      isGenerating: true,
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

    // Histórico para a API: exclui a bolha vazia; IA anterior sem código (economiza tokens)
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

    // Passo C: streaming real (OpenRouter)
    try {
      await streamAIResponse(
        // Passo D: atualiza só o chat em tempo real (arquivos no finish — evita imports incompletos)
        (accumulated) => {
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === aiMessageId
                ? { ...message, content: accumulated }
                : message,
            ),
          }));
        },
        // Passo E: aplica arquivos + versiona
        (finalText) => {
          const parsedFiles = parseAIResponse(finalText);
          const paths = Object.keys(parsedFiles);
          const generatedVersionId = crypto.randomUUID();

          set((state) => {
            const nextFiles =
              paths.length > 0
                ? {
                    ...state.files,
                    ...parsedFiles,
                  }
                : state.files;

            return {
              files: nextFiles,
              activeFile: paths.includes("/App.tsx")
                ? "/App.tsx"
                : paths[paths.length - 1] ?? state.activeFile,
              isGenerating: false,
              versions: [
                ...state.versions,
                {
                  id: generatedVersionId,
                  prompt: content.slice(0, 60),
                  timestamp: Date.now(),
                  files: { ...nextFiles },
                },
              ],
              activeVersionId: generatedVersionId,
            };
          });
        },
        history,
      );
    } catch (error) {
      const errorText =
        error instanceof Error
          ? `Erro ao gerar resposta: ${error.message}`
          : "Erro ao gerar resposta.";
      set((state) => ({
        isGenerating: false,
        messages: state.messages.map((message) =>
          message.id === aiMessageId
            ? { ...message, content: errorText }
            : message,
        ),
      }));
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
        activeFile: version.files[state.activeFile] ? state.activeFile : "/App.tsx",
        activeVersionId: version.id,
      };
    }),
  resetProject: () =>
    set({
      messages: [{ ...welcomeMessage, id: crypto.randomUUID() }],
      isGenerating: false,
      files: {
        "/App.tsx": initialApp,
        "/package.json": initialPackageJson,
      },
      activeFile: "/App.tsx",
      versions: [],
      activeVersionId: null,
    }),
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
    });
  },
}));
