"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAssetObjectUrl } from "@/components/assets/useAssetObjectUrl";

type TurntableKind = "logo" | "object";

const MODEL_VIEWER_SRC =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";

function orbitFor(kind: TurntableKind) {
  if (kind === "logo") {
    return {
      orbit: "38deg 68deg 145%",
      min: "auto 64deg auto",
      max: "auto 76deg auto",
      fov: "26deg",
    };
  }
  return {
    orbit: "28deg 70deg 115%",
    min: "auto 58deg auto",
    max: "auto 80deg auto",
    fov: "30deg",
  };
}

function loadModelViewer(): Promise<void> {
  if (typeof customElements !== "undefined" && customElements.get("model-viewer")) {
    return Promise.resolve();
  }
  const existing = document.querySelector("script[data-x09-model-viewer]");
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("cdn")), {
        once: true,
      });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = MODEL_VIEWER_SRC;
    script.dataset.x09ModelViewer = "1";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("cdn")), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

/**
 * Turntable: carrega o GLB com cookie de sessão (blob) e o viewer por CDN.
 * O import npm do model-viewer falha no build standalone da VPS.
 */
export function MeshTurntable({
  assetId,
  src,
  kind = "object",
  className,
}: {
  assetId?: string;
  src?: string;
  kind?: TurntableKind;
  className?: string;
}) {
  const fromApi = useAssetObjectUrl(assetId ?? null);
  const blobSrc = src || fromApi.url;
  const hostRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadModelViewer()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !blobSrc) return;
    const el = hostRef.current;
    if (!el) return;
    const cfg = orbitFor(kind);
    el.setAttribute("src", blobSrc);
    el.setAttribute("camera-orbit", cfg.orbit);
    el.setAttribute("min-camera-orbit", cfg.min);
    el.setAttribute("max-camera-orbit", cfg.max);
    el.setAttribute("field-of-view", cfg.fov);
    el.setAttribute("min-field-of-view", "18deg");
    el.setAttribute("max-field-of-view", "36deg");
    el.toggleAttribute("camera-controls", true);
    el.toggleAttribute("auto-rotate", true);
    el.setAttribute("auto-rotate-delay", "0");
    el.setAttribute("rotation-per-second", kind === "logo" ? "18deg" : "24deg");
    el.setAttribute("shadow-intensity", "1");
    el.setAttribute("shadow-softness", "0.65");
    el.setAttribute("environment-image", "neutral");
    el.setAttribute("exposure", "1.1");
    el.toggleAttribute("autoplay", true);
    el.setAttribute("interaction-prompt", "none");
  }, [ready, blobSrc, kind]);

  if (fromApi.error && !src) {
    return (
      <p className="grid h-full place-items-center p-6 text-sm text-zinc-400">
        {fromApi.error}. Se acabou de gerar, espere um pouco e tente de novo.
      </p>
    );
  }

  if (failed) {
    return (
      <p className="p-6 text-sm text-zinc-400">
        Não foi possível carregar o viewer 3D.
      </p>
    );
  }

  if (!ready || fromApi.loading || !blobSrc) {
    return (
      <p className="grid h-full place-items-center p-6 text-sm text-zinc-500">
        A preparar o 360°…
      </p>
    );
  }

  return (
    <model-viewer
      ref={(node) => {
        hostRef.current = node;
      }}
      src={blobSrc}
      autoplay
      alt="Pré-visualização 360 do mesh"
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "transparent",
      }}
    />
  );
}

export function MeshPreviewDialog({
  assetId,
  src,
  title,
  kind = "object",
  onClose,
}: {
  assetId?: string;
  src?: string;
  title: string;
  kind?: TurntableKind;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex h-[min(40rem,90dvh)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c0d12] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-5 py-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Turntable · objeto 3D
            </p>
            <h2 className="truncate text-sm font-medium text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-white/10 hover:text-white"
          >
            Fechar
          </button>
        </div>
        <div className="relative min-h-0 flex-1 bg-[radial-gradient(ellipse_at_center,_#222536_0%,_#07080c_70%)]">
          <div className="absolute inset-0">
            <MeshTurntable assetId={assetId} src={src} kind={kind} />
          </div>
        </div>
        <p className="shrink-0 border-t border-white/8 px-5 py-2 text-[11px] text-zinc-500">
          Gire na horizontal, sempre um pouco de cima. O objeto também ficou
          guardado na Biblioteca.
        </p>
      </div>
    </div>,
    document.body,
  );
}
