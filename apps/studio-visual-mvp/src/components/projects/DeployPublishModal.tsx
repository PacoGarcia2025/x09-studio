import { Check, Copy, Loader2, Rocket } from "lucide-react";
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

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setUrl(null);
      setError(null);
      setBusy(false);
      setDeploymentId(null);
      setCopied(false);
    }
  }, [open]);

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

  async function copyUrl() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-glow">
        <div>
          <h3 className="text-lg font-semibold text-primary">Publicar na Vercel</h3>
          <p className="mt-1 text-sm text-secondary">
            Empacota o projeto Vite, sobe um deployment e devolve a URL pública.
            Arquivos `.env` e segredos são excluídos.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-4 text-sm text-secondary">
          <p>
            Status:{" "}
            <span className="font-medium text-primary">{status}</span>
          </p>
          {url ? (
            <p className="mt-2 break-all text-violet-200">
              <a href={url} target="_blank" rel="noreferrer" className="underline">
                {url}
              </a>
            </p>
          ) : (
            <p className="mt-2">A URL aparece quando o build ficar pronto.</p>
          )}
          {error ? <p className="mt-2 text-red-300">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          {url ? (
            <Button type="button" variant="ghost" onClick={() => void copyUrl()}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copiar URL
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={busy || status === "building" || status === "queued"}
            onClick={() => void handleDeploy()}
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            {busy || status === "building" || status === "queued" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {status === "ready" ? "Publicar novamente" : "Publicar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
