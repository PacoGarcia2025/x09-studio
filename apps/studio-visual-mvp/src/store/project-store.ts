import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import {
  useStudioStore,
  type ChatMessage,
  type GenerationMetrics,
  type StudioVersion,
} from "@/store/studio-store";
import { useUserStore } from "@/store/user-store";

export type ProjectSummary = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  published_url?: string | null;
  publish_status?: string | null;
  github_repo_full_name?: string | null;
};

type ProjectRow = ProjectSummary & {
  user_id: string;
  files: Record<string, string> | null;
  chat_history: ChatMessage[] | null;
  app_spec?: unknown;
  metrics?: GenerationMetrics | null;
};

type VersionRow = {
  id: string;
  prompt: string;
  files: Record<string, string> | null;
  created_at: string;
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

const TABLE = "visual_projects";
const VERSIONS_TABLE = "visual_project_versions";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function deriveProjectName(messages: ChatMessage[]): string {
  const firstUser = messages.find(
    (message) => message.role === "user" && message.content.trim(),
  );
  if (!firstUser) return "Projeto sem título";

  const cleaned = firstUser.content.trim().replace(/\s+/g, " ");
  return cleaned.length > 48 ? `${cleaned.slice(0, 48)}…` : cleaned;
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

    const { data, error } = await supabase
      .from(TABLE)
      .select(
        "id, name, created_at, updated_at, published_url, publish_status, github_repo_full_name",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      set({
        isLoadingList: false,
        lastError: "Não foi possível listar projetos.",
      });
      return { error: "Não foi possível listar projetos." };
    }

    set({
      isLoadingList: false,
      projectsList: (data as ProjectSummary[]) ?? [],
    });
    return { error: null };
  },

  saveProject: async () => {
    const userId = useUserStore.getState().session?.user?.id;
    if (!userId) {
      return { error: "Faça login para salvar o projeto." };
    }

    const studio = useStudioStore.getState();
    const { files, messages, lastAppSpec, metrics, versions } = studio;
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

    const { error } = await supabase.from(TABLE).upsert(payload, {
      onConflict: "id",
    });

    set({ isSaving: false });

    if (error) {
      set({ lastError: error.message });
      return { error: error.message };
    }

    const versionRows = versions
      .filter((version) => isUuid(version.id))
      .slice(-20)
      .map((version) => ({
        id: version.id,
        project_id: projectId,
        user_id: userId,
        prompt: version.prompt,
        files: version.files,
        created_at: new Date(version.timestamp).toISOString(),
      }));

    if (versionRows.length > 0) {
      // Histórico é complementar: não invalida o save principal se a migration
      // ainda não foi aplicada no ambiente remoto.
      await supabase.from(VERSIONS_TABLE).upsert(versionRows, {
        onConflict: "id",
      });
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

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return { error: "Projeto não encontrado." };
    }

    const row = data as ProjectRow;
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

    const { data: versionData } = await supabase
      .from(VERSIONS_TABLE)
      .select("id, prompt, files, created_at")
      .eq("project_id", row.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(20);

    const versions: StudioVersion[] = ((versionData as VersionRow[] | null) ?? [])
      .filter(
        (version) =>
          version.files &&
          typeof version.files === "object" &&
          Object.keys(version.files).length > 0,
      )
      .map((version) => ({
        id: version.id,
        prompt: version.prompt,
        timestamp: new Date(version.created_at).getTime(),
        files: version.files!,
      }));

    useStudioStore.getState().hydrateProject({
      files,
      messages,
      versions,
      appSpec: row.app_spec ?? null,
      metrics: row.metrics ?? null,
    });

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
