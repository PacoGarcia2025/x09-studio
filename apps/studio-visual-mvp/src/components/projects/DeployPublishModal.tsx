import { Check, Copy, Edit2, Loader2, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ApiClientError,
  fetchDeployStatus,
  startDeploy,
} from "@/lib/api-client";
import { useProjectStore } from "@/store/project-store";

export function DeployPublishModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const saveProject = useProjectStore((s) => s.saveProject);
  const fetchUserProjects = useProjectStore((s) => s.fetchUserProjects);

  const [status, setStatus] = useState<string>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);

  const [customSlug, setCustomSlug] = useState("");
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setUrl(null);
      setError(null);
      setBusy(false);
      setDeploymentId(null);
      setCopied(false);
      setCustomSlug("");
      setIsEditingSlug(false);
      setSavingSlug(false);
      setSlugError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!url) return;
    try {
      const parsed = new URL(url);
      const hostParts = parsed.hostname.split(".");
      if (hostParts.length > 0 && hostParts[0]) {
        setCustomSlug(hostParts[0]);
      }
    } catch {
      // url pode ser caminho relativo em dev
    }
  }, [url]);

  useEffect(() => {
    if (!open || !projectId || !deploymentId) return;
    if (status === "ready" || status === "error" || status === "canceled") {
      return;
    }

    let cancelled = false;
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const { deployment } = await fetchDeployStatus(
            projectId,
            deploymentId,
          );
          if (cancelled) return;
          const nextStatus = String(deployment.status ?? "building");
          setStatus(nextStatus);
          if (deployment.url) setUrl(String(deployment.url));
          if (deployment.error_message) {
            setError(String(deployment.error_message));
          }
          if (
            nextStatus === "ready" ||
            nextStatus === "error" ||
            nextStatus === "canceled"
          ) {
            void fetchUserProjects();
          }
        } catch {
          // keep polling
        }
      })();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, projectId, deploymentId, status, fetchUserProjects]);

  if (!open) return null;

  async function handleDeploy() {
    setBusy(true);
    setError(null);
    setUrl(null);
    setStatus("queued");
    try {
      let id = projectId;
      if (!id) {
        const saved = await saveProject();
        if (saved.error || !saved.id) {
          throw new Error(saved.error || "Salve o projeto antes de publicar.");
        }
        id = saved.id;
      } else {
        await saveProject();
      }

      const { deployment } = await startDeploy(id);
      setDeploymentId(String(deployment.id));
      setStatus(String(deployment.status ?? "building"));
      if (deployment.url) setUrl(String(deployment.url));
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Falha no deploy.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSlug() {
    if (!projectId || !customSlug.trim()) return;
    setSavingSlug(true);
    setSlugError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish-slug`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: customSlug.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Falha ao atualizar subdomínio.");
      }
      setUrl(data.publishedUrl);
      setIsEditingSlug(false);
      void fetchUserProjects();
    } catch (err) {
      setSlugError(err instanceof Error ? err.message : "Erro ao alterar subdomínio.");
    } finally {
      setSavingSlug(false);
    }
  }

  async function copyUrl() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg space-y-5 rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div>
          <h3 className="text-xl font-bold text-primary">Publicar na Vercel</h3>
          <p className="mt-1 text-sm text-secondary">
            Empacota o projeto Vite, gera a aplicação ao vivo e disponibiliza no seu subdomínio exclusivo.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background/80 p-4 text-sm text-secondary space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</span>
            <span className="font-semibold text-primary capitalize px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">{status}</span>
          </div>

          {url ? (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block">Subdomínio do Site</span>

              {isEditingSlug ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="seu-subdominio-personalizado"
                      className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-primary focus:border-violet-500 focus:outline-none"
                    />
                    <span className="text-xs text-muted-foreground">.studio.x09.com.br</span>
                  </div>
                  {slugError ? <p className="text-xs text-red-400">{slugError}</p> : null}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingSlug(false)}>
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" disabled={savingSlug} onClick={() => void handleSaveSlug()} className="bg-violet-600 text-white">
                      {savingSlug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar Subdomínio"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-surface/50 p-2.5 border border-border/40">
                  <a href={url} target="_blank" rel="noreferrer" className="truncate font-medium text-violet-300 hover:underline">
                    {url}
                  </a>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingSlug(true)} className="h-8 px-2 text-xs text-secondary hover:text-primary">
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">A URL pública estará disponível assim que o build for concluído.</p>
          )}

          {error ? <p className="mt-2 text-sm text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          {url ? (
            <Button type="button" variant="outline" onClick={() => void copyUrl()} className="gap-1.5">
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar URL"}
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={busy || status === "building" || status === "queued"}
            onClick={() => void handleDeploy()}
            className="bg-violet-600 text-white hover:bg-violet-700 font-medium px-5"
          >
            {busy || status === "building" || status === "queued" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Rocket className="h-4 w-4 mr-1.5" />
            )}
            {status === "ready" ? "Publicar novamente" : "Publicar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
