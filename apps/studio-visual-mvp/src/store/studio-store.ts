import { create } from "zustand";
import { streamAIResponse } from "@/lib/api";
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
};

const initialApp = `export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-3xl font-bold text-white">
      Hello X09 Studio
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
  messages: [
    {
      id: "welcome",
      role: "ai",
      content:
        "Olá, eu sou o X09. Descreva o sistema que você quer construir e eu preparo a primeira versão.",
    },
  ],
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

    // Passo C: streaming simulado
    await new Promise<void>((resolve) => {
      streamAIResponse(
        // Passo D: atualiza chat + arquivos em tempo real
        (accumulated) => {
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === aiMessageId
                ? { ...message, content: accumulated }
                : message,
            ),
          }));

          const parsedFiles = parseAIResponse(accumulated);
          const paths = Object.keys(parsedFiles);
          if (paths.length === 0) return;

          const { updateFile, setActiveFile } = get();
          for (const [path, fileContent] of Object.entries(parsedFiles)) {
            updateFile(path, fileContent);
          }
          setActiveFile(paths[paths.length - 1]!);
        },
        // Passo E: finaliza e versiona
        () => {
          const generatedVersionId = crypto.randomUUID();
          set((state) => ({
            isGenerating: false,
            versions: [
              ...state.versions,
              {
                id: generatedVersionId,
                prompt: content.slice(0, 60),
                timestamp: Date.now(),
                files: { ...state.files },
              },
            ],
            activeVersionId: generatedVersionId,
          }));
          resolve();
        },
      );
    });
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
}));
