"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildProjectSubdomainHost,
  buildProjectPathUrl,
  isSubdomainPublishReady,
  resolvePublicShareUrl,
} from "@/lib/projects/publish-url";
import { publishProjectAction } from "@/lib/projects/publish.actions";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectSlug: string;
  initialUrl?: string | null;
  isPublished: boolean;
  canPublish?: boolean;
  publishBlockReason?: string;
  onPublished: (url: string) => void;
};

export function PublishPanel({
  open,
  onClose,
  projectId,
  projectSlug,
  initialUrl,
  isPublished,
  canPublish = true,
  publishBlockReason,
  onPublished,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const subdomainReady = isSubdomainPublishReady();
  const shareUrl = resolvePublicShareUrl(projectSlug, initialUrl);
  const [url, setUrl] = useState(shareUrl);
  const [host, setHost] = useState(buildProjectSubdomainHost(projectSlug));
  const [published, setPublished] = useState(isPublished);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDomainSettings, setShowDomainSettings] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUrl(resolvePublicShareUrl(projectSlug, initialUrl));
    setHost(buildProjectSubdomainHost(projectSlug));
    setPublished(isPublished);
    setError(publishBlockReason && !canPublish ? publishBlockReason : null);
    setCopied(false);
  }, [open, initialUrl, isPublished, projectSlug, canPublish, publishBlockReason]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const runPublish = useCallback(async () => {
    if (!canPublish) {
      setError(
        publishBlockReason ??
          "Construa o app antes de publicar (OK, construir app no chat).",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await publishProjectAction(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUrl(
        subdomainReady
          ? result.url
          : buildProjectPathUrl(projectSlug),
      );
      setHost(buildProjectSubdomainHost(projectSlug));
      setPublished(true);
      onPublished(result.url);
    } finally {
      setBusy(false);
    }
  }, [canPublish, onPublished, projectId, projectSlug, publishBlockReason, subdomainReady]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar o link.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-16 sm:justify-end sm:p-6 sm:pt-20">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="x09-card relative z-10 w-full max-w-[400px] rounded-2xl p-5 shadow-2xl ring-1 ring-white/10"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-white">
            {published ? "Publicado" : busy ? "Publicando…" : "Publicar site"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          >
            Fechar
          </button>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-zinc-500">URL do site</p>
            <button
              type="button"
              onClick={() => setShowDomainSettings((v) => !v)}
              className="text-xs font-medium text-violet-300 hover:text-violet-200"
            >
              Domínio próprio
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
              {subdomainReady ? host : url.replace(/^https:\/\//, "")}
            </span>
            <button
              type="button"
              onClick={() => void copyUrl()}
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
              title="Copiar link"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>

          {!subdomainReady ? (
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Link público ativo em{" "}
              <span className="text-zinc-300">{url.replace(/^https:\/\//, "")}</span>
            </p>
          ) : null}

          {published || canPublish ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs font-medium text-violet-300 hover:text-violet-200"
            >
              Abrir site publicado →
            </a>
          ) : null}
        </div>

        {showDomainSettings ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-black/20 p-3">
            <p className="text-xs font-medium text-zinc-300">Domínio personalizado</p>
            <input
              disabled
              placeholder="www.seusite.com.br"
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-500"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Wizard DNS + SSL em breve. Por enquanto use o subdomínio{" "}
              <strong className="text-zinc-300">{host}</strong>.
            </p>
          </div>
        ) : null}

        {!canPublish ? (
          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
            <p className="font-medium">App ainda não pronto para publicar</p>
            <p className="mt-1 text-amber-100/80">
              {publishBlockReason ??
                "Confirme «OK, construir app» no chat e aguarde o preview carregar."}
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-200 ring-1 ring-red-400/20">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void runPublish()}
          disabled={busy || !canPublish}
          className="x09-button-primary mt-4 w-full py-2.5 text-sm disabled:opacity-50"
        >
          {busy
            ? "Publicando…"
            : !canPublish
              ? "Aguardando preview"
              : published
                ? "Atualizar site"
                : "Publicar agora"}
        </button>
      </div>
    </div>
  );
}
