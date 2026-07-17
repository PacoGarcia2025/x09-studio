import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import {
  useStudioStore,
  type ChatMessage,
} from "@/store/studio-store";
import { useUserStore } from "@/store/user-store";

export type ProjectSummary = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type ProjectRow = ProjectSummary & {
  user_id: string;
  files: Record<string, string> | null;
  chat_history: ChatMessage[] | null;
  app_spec?: unknown;
  metrics?: unknown;
};

type ProjectState = {
  currentProjectId: string | null;
  currentProjectName: string | null;
  projectsList: ProjectSummary[];
  isSaving: boolean;
  isLoadingList: boolean;
  lastSavedAt: number | null;
  lastError: string | null;
  setCurrentProjectId: (id: string | null) => void;
  clearCurrentProject: () => void;
  fetchUserProjects: () => Promise<{ error: string | null }>;
  saveProject: () => Promise<{ error: string | null; id?: string }>;
  loadProject: (id: string) => Promise<{ error: string | null }>;
  createNewProject: () => void;
};

const TABLES = ["visual_projects", "projects"] as const;

function deriveProjectName(messages: ChatMessage[]): string {
  const firstUser = messages.find(
    (message) => message.role === "user" && message.content.trim(),
  );
  if (!firstUser) return "Projeto sem título";

  const cleaned = firstUser.content.trim().replace(/\s+/g, " ");
  return cleaned.length > 48 ? `${cleaned.slice(0, 48)}…` : cleaned;
}

async function upsertProject(payload: Record<string, unknown>) {
  let lastError: string | null = null;
  for (const table of TABLES) {
    const { error } = await supabase.from(table).upsert(payload, {
      onConflict: "id",
    });
    if (!error) return { error: null, table };
    lastError = error.message;
  }
  return { error: lastError ?? "Falha ao salvar", table: null };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProjectId: null,
  currentProjectName: null,
  projectsList: [],
  isSaving: false,
  isLoadingList: false,
  lastSavedAt: null,
  lastError: null,

  setCurrentProjectId: (id) => set({ currentProjectId: id }),

  clearCurrentProject: () =>
    set({
      currentProjectId: null,
      currentProjectName: null,
      lastSavedAt: null,
      lastError: null,
    }),

  createNewProject: () => {
    get().clearCurrentProject();
    useStudioStore.getState().resetProject();
  },

  fetchUserProjects: async () => {
    const userId = useUserStore.getState().session?.user?.id;
    if (!userId) {
      set({ projectsList: [] });
      return { error: "Faça login para ver seus projetos." };
    }

    set({ isLoadingList: true, lastError: null });

    for (const table of TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select("id, name, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (!error) {
        set({
          isLoadingList: false,
          projectsList: (data as ProjectSummary[]) ?? [],
        });
        return { error: null };
      }
    }

    set({
      isLoadingList: false,
      lastError: "Não foi possível listar projetos.",
    });
    return { error: "Não foi possível listar projetos." };
  },

  saveProject: async () => {
    const userId = useUserStore.getState().session?.user?.id;
    if (!userId) {
      return { error: "Faça login para salvar o projeto." };
    }

    const studio = useStudioStore.getState();
    const { files, messages, lastAppSpec, metrics } = studio;
    const existingId = get().currentProjectId;
    const projectId = existingId ?? crypto.randomUUID();
    const name =
      get().currentProjectName && existingId
        ? get().currentProjectName!
        : deriveProjectName(messages);
    const now = new Date().toISOString();

    set({ isSaving: true, lastError: null });

    const payload = {
      id: projectId,
      user_id: userId,
      name,
      files,
      chat_history: messages,
      app_spec: lastAppSpec,
      metrics,
      updated_at: now,
      ...(existingId ? {} : { created_at: now }),
    };

    const result = await upsertProject(payload);
    set({ isSaving: false });

    if (result.error) {
      set({ lastError: result.error });
      return { error: result.error };
    }

    set({
      currentProjectId: projectId,
      currentProjectName: name,
      lastSavedAt: Date.now(),
    });

    void get().fetchUserProjects();
    return { error: null, id: projectId };
  },

  loadProject: async (id) => {
    const userId = useUserStore.getState().session?.user?.id;
    if (!userId) {
      return { error: "Faça login para abrir um projeto." };
    }

    set({ lastError: null });

    let row: ProjectRow | null = null;
    for (const table of TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && data) {
        row = data as ProjectRow;
        break;
      }
    }

    if (!row) {
      return { error: "Projeto não encontrado." };
    }

    const files =
      row.files && typeof row.files === "object" && Object.keys(row.files).length > 0
        ? row.files
        : {
            "/App.tsx": `export default function App() {
  return <div className="min-h-screen grid place-items-center bg-[#06030d] text-white">Projeto vazio</div>;
}
`,
          };
    const messages = Array.isArray(row.chat_history) ? row.chat_history : [];

    useStudioStore.getState().hydrateProject({ files, messages });

    set({
      currentProjectId: row.id,
      currentProjectName: row.name,
      lastSavedAt: row.updated_at
        ? new Date(row.updated_at).getTime()
        : Date.now(),
    });

    return { error: null };
  },
}));
