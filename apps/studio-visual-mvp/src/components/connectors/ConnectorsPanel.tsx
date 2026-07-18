import { GitBranch, Loader2, RefreshCw, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ApiClientError,
  createProjectRepo,
  fetchGitHubStatus,
  fetchProjectRepo,
  pushProjectRepo,
  startGitHubInstall,
} from "@/lib/api-client";
import { useProjectStore } from "@/store/project-store";

export function ConnectorsPanel() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const projectName = useProjectStore((s) => s.currentProjectName);
  const saveProject = useProjectStore((s) => s.saveProject);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [repo, setRepo] = useState<{
    full_name?: string;
    html_url?: string;
    last_commit_sha?: string;
    last_synced_at?: string;
  } | null>(null);

  async function refresh() {
    setLoading(true);
    setMessage(null);
    try {
      const status = await fetchGitHubStatus();
      setConnected(status.connected);
      setAccount(status.installations[0]?.account_login ?? null);

      if (projectId) {
        const { repository } = await fetchProjectRepo(projectId);
        setRepo(
          repository
            ? {
                full_name: String(repository.full_name ?? ""),
                html_url: String(repository.html_url ?? ""),
                last_commit_sha: repository.last_commit_sha
                  ? String(repository.last_commit_sha)
                  : undefined,
                last_synced_at: repository.last_synced_at
                  ? String(repository.last_synced_at)
                  : undefined,
              }
            : null,
        );
      } else {
        setRepo(null);
      }
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : "Falha ao carregar conectores.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [projectId]);

  async function handleInstall() {
    setBusy(true);
    setMessage(null);
    try {
      const { url } = await startGitHubInstall();
      window.location.href = url;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao iniciar instalação.",
      );
      setBusy(false);
    }
  }

  async function ensureProjectId(): Promise<string | null> {
    if (projectId) return projectId;
    const saved = await saveProject();
    return saved.id ?? null;
  }

  async function handleCreateRepo() {
    setBusy(true);
    setMessage(null);
    try {
      const id = await ensureProjectId();
      if (!id) throw new Error("Salve o projeto antes de criar o repositório.");
      const { repository } = await createProjectRepo(id, projectName || undefined);
      setRepo({
        full_name: String(repository.full_name ?? ""),
        html_url: String(repository.html_url ?? ""),
      });
      setMessage("Repositório criado/vinculado.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar repo.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePush() {
    setBusy(true);
    setMessage(null);
    try {
      const id = await ensureProjectId();
      if (!id) throw new Error("Salve o projeto antes de sincronizar.");
      await saveProject();
      const result = await pushProjectRepo(id);
      setMessage(
        `Sincronizado: ${result.filesPushed} arquivos · commit ${result.commitSha.slice(0, 7)}`,
      );
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no push.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Conectores</h1>
        <p className="mt-1 text-sm text-secondary">
          Vincule o GitHub App, crie o repositório do projeto e sincronize o
          código (segredos são filtrados automaticamente).
        </p>
      </div>

      <section className="glass-card space-y-4 rounded-3xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <GitBranch className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-primary">GitHub App</h2>
              <p className="text-xs text-secondary">
                {loading
                  ? "Carregando…"
                  : connected
                    ? `Conectado como ${account}`
                    : "Não instalado"}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading || busy}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {!connected ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() => void handleInstall()}
            className="bg-gradient-to-r from-cyan-300 to-sky-500 text-zinc-950"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
            Instalar GitHub App
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
              <p className="text-secondary">Projeto atual</p>
              <p className="font-medium text-primary">
                {projectName || "Nenhum projeto aberto"}
              </p>
              {repo?.full_name ? (
                <p className="mt-2 text-xs text-cyan-200">
                  Repo:{" "}
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {repo.full_name}
                  </a>
                  {repo.last_commit_sha
                    ? ` · ${repo.last_commit_sha.slice(0, 7)}`
                    : ""}
                </p>
              ) : (
                <p className="mt-2 text-xs text-secondary">
                  Ainda sem repositório vinculado.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {!repo?.full_name ? (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCreateRepo()}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Criar repositório
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void handlePush()}
                  className="bg-gradient-to-r from-cyan-300 to-sky-500 text-zinc-950"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sincronizar (push)
                </Button>
              )}
            </div>
          </div>
        )}

        {message ? (
          <p className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
