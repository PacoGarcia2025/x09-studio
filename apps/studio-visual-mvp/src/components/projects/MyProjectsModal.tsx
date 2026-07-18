import { FolderOpen, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";

type MyProjectsModalProps = {
  open: boolean;
  onClose: () => void;
  onOpened?: () => void;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function MyProjectsModal({ open, onClose, onOpened }: MyProjectsModalProps) {
  const projectsList = useProjectStore((state) => state.projectsList);
  const isLoadingList = useProjectStore((state) => state.isLoadingList);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const fetchUserProjects = useProjectStore((state) => state.fetchUserProjects);
  const loadProject = useProjectStore((state) => state.loadProject);

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    void fetchUserProjects().then((result) => {
      if (result.error) setError(result.error);
    });
  }, [open, fetchUserProjects]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleOpen(id: string) {
    setLoadingId(id);
    setError(null);
    const result = await loadProject(id);
    setLoadingId(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    onOpened?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-glow">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-transparent" />

        <div className="relative flex items-start justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 text-zinc-950 shadow-glow">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary">Meus Projetos</h2>
              <p className="text-xs text-secondary">
                Abra um projeto salvo para continuar de onde parou.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}

          {isLoadingList ? (
            <div className="flex items-center justify-center gap-2 py-16 text-secondary">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              Carregando projetos…
            </div>
          ) : projectsList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/50 px-6 py-16 text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-secondary" />
              <p className="mt-3 text-sm font-medium text-primary">
                Nenhum projeto salvo ainda
              </p>
              <p className="mt-1 text-xs text-secondary">
                Gere algo no chat e clique em Salvar Projeto — ou o auto-save fará isso após a IA.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projectsList.map((project) => {
                const isActive = project.id === currentProjectId;
                const isLoading = loadingId === project.id;

                return (
                  <button
                    key={project.id}
                    type="button"
                    disabled={Boolean(loadingId)}
                    onClick={() => void handleOpen(project.id)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition",
                      "hover:border-accent/60 hover:bg-background/80",
                      isActive
                        ? "border-accent bg-accent/10 shadow-glow"
                        : "border-border bg-background",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-semibold text-primary">
                        {project.name || "Projeto sem título"}
                      </p>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
                      ) : null}
                    </div>
                    <p className="mt-3 text-[11px] uppercase tracking-wide text-secondary">
                      Atualizado
                    </p>
                    <p className="text-xs text-secondary">
                      {formatDate(project.updated_at || project.created_at)}
                    </p>
                    {project.published_url ? (
                      <p className="mt-2 truncate text-[11px] text-cyan-300">
                        {project.published_url}
                      </p>
                    ) : project.publish_status ? (
                      <p className="mt-2 text-[11px] text-secondary">
                        Deploy: {project.publish_status}
                      </p>
                    ) : null}
                    {project.github_repo_full_name ? (
                      <p className="mt-1 truncate text-[11px] text-secondary">
                        {project.github_repo_full_name}
                      </p>
                    ) : null}
                    {isActive ? (
                      <p className="mt-2 text-[11px] font-medium text-accent">
                        Projeto atual
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
