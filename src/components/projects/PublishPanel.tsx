"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildProjectSubdomainHost,
  buildProjectSubdomainUrl,
  resolveProjectPublishUrl,
} from "@/lib/projects/publish-url";
import { publishProjectAction } from "@/lib/projects/publish.actions";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectSlug: string;
  initialUrl?: string | null;
  isPublished: boolean;
  onPublished: (url: string) => void;
};

export function PublishPanel({
  open,
  onClose,
  projectId,
  projectSlug,
  initialUrl,
  isPublished,
  onPublished,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const canonicalUrl = resolveProjectPublishUrl(projectSlug, initialUrl);
  const [url, setUrl] = useState(canonicalUrl);
  const [host, setHost] = useState(buildProjectSubdomainHost(projectSlug));
  const [published, setPublished] = useState(isPublished);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDomainSettings, setShowDomainSettings] = useState(false);
  const autoPublishStarted = useRef(false);

  useEffect(() => {
    if (!open) return;
    setUrl(resolveProjectPublishUrl(projectSlug, initialUrl));
    setHost(buildProjectSubdomainHost(projectSlug));
    setPublished(isPublished);
    setError(null);
    setCopied(false);
  }, [open, initialUrl, isPublished, projectSlug]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-publish-trigger]")) return;
      onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose]);

  const runPublish = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await publishProjectAction(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUrl(result.url);
      setHost(buildProjectSubdomainHost(projectSlug));
      setPublished(true);
      onPublished(result.url);
    } finally {
      setBusy(false);
    }
  }, [onPublished, projectId, projectSlug]);

  useEffect(() => {
    if (!open) {
      autoPublishStarted.current = false;
      return;
    }
    if (published || autoPublishStarted.current || busy) return;
    autoPublishStarted.current = true;
    void runPublish();
  }, [open, published, busy, runPublish]);

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
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-1rem,380px)] rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl ring-1 ring-black/5"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-900">
          {published ? "Publicado" : "Publicando…"}
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
          <span aria-hidden>👁</span> 0
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-500">URL do site</p>
          <button
            type="button"
            onClick={() => setShowDomainSettings((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
          >
            <span aria-hidden>🔗</span>
            Adicionar domínio próprio
            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
              Pro
            </span>
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">
            {host}
          </span>
          <button
            type="button"
            onClick={() => void copyUrl()}
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-white hover:text-zinc-800"
            title="Copiar link"
          >
            {copied ? "✓" : "⎘"}
          </button>
        </div>
      </div>

      {showDomainSettings ? (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 p-3">
          <p className="text-xs font-medium text-zinc-700">Domínio personalizado</p>
          <input
            disabled
            placeholder="www.seusite.com.br"
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-400"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Wizard DNS + SSL em breve. Por enquanto use o subdomínio{" "}
            <strong>{host}</strong>.
          </p>
        </div>
      ) : null}

      <div className="mt-4 border-t border-zinc-100 pt-4">
        <p className="text-xs font-medium text-zinc-500">
          Quem pode ver este site
        </p>
        <div className="mt-2 flex items-start gap-2">
          <span className="text-lg leading-none" aria-hidden>
            🌐
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Público</p>
            <p className="text-xs text-zinc-500">Qualquer pessoa com o link</p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled
          className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-400"
        >
          Revisar segurança
        </button>
        <button
          type="button"
          onClick={() => setShowDomainSettings(true)}
          className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Editar configurações
        </button>
      </div>

      <button
        type="button"
        onClick={() => void runPublish()}
        disabled={busy}
        className="mt-3 w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
      >
        {busy ? "Atualizando…" : published ? "Atualizar" : "Publicar agora"}
      </button>
    </div>
  );
}
