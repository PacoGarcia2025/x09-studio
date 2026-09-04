"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  LANDING_ROBOT_GLB,
  LANDING_ROBOT_PNG,
} from "@/lib/brand/landing-robot";

const MODEL_VIEWER_SRC =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";

type X09RobotProps = {
  compact?: boolean;
  /** Server já viu public/landing/x09-robot.glb — evita HEAD 404. */
  hasGlb?: boolean;
};

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
 * Mascote X09. Com GLB de alta qualidade no public/, gira no palco.
 * Senão, o PNG oficial.
 */
export function X09Robot({ compact = false, hasGlb = false }: X09RobotProps) {
  const size = compact ? 176 : 560;
  const hostRef = useRef<HTMLElement | null>(null);
  const [viewer, setViewer] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  const showGlb = hasGlb && viewer && !failed && !compact;

  useEffect(() => {
    if (compact || !hasGlb) return;
    let cancelled = false;
    void loadModelViewer().then(
      () => {
        if (!cancelled) setViewer(true);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [compact, hasGlb]);

  useEffect(() => {
    if (!showGlb) return;
    const el = hostRef.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    el.setAttribute("src", LANDING_ROBOT_GLB);
    el.setAttribute("poster", LANDING_ROBOT_PNG);
    el.setAttribute("camera-orbit", "32deg 68deg 108%");
    el.setAttribute("min-camera-orbit", "auto 48deg auto");
    el.setAttribute("max-camera-orbit", "auto 92deg auto");
    el.setAttribute("field-of-view", "26deg");
    el.setAttribute("min-field-of-view", "18deg");
    el.setAttribute("max-field-of-view", "34deg");
    el.setAttribute("auto-rotate-delay", "400");
    el.setAttribute("rotation-per-second", "18deg");
    el.setAttribute("shadow-intensity", "1");
    el.setAttribute("shadow-softness", "0.92");
    el.setAttribute("environment-image", "neutral");
    el.setAttribute("tone-mapping", "commerce");
    el.setAttribute("exposure", "1.18");
    el.setAttribute("interaction-prompt", "none");
    el.setAttribute("loading", "eager");
    el.setAttribute("reveal", "auto");
    el.setAttribute("interpolation-decay", "180");
    el.toggleAttribute("auto-rotate", !reduce);
    el.toggleAttribute("camera-controls", true);
    el.toggleAttribute("autoplay", true);
    el.toggleAttribute("disable-tap", true);

    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ totalProgress?: number }>).detail;
      const value = detail?.totalProgress;
      if (typeof value === "number") setProgress(value);
    };
    const onLoad = () => {
      setProgress(1);
      setLoaded(true);
    };
    const onError = () => setFailed(true);

    el.addEventListener("progress", onProgress);
    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("progress", onProgress);
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onError);
    };
  }, [showGlb]);

  return (
    <div
      className={`x09-mascot-wrap ${compact ? "x09-mascot-compact" : ""} ${
        showGlb ? "x09-mascot-3d" : ""
      }`}
      aria-label="Robô X09"
    >
      <div className="x09-mascot-glow" aria-hidden />
      <div className="x09-mascot-floor" aria-hidden />
      {!showGlb ? <div className="x09-mascot-orbit" aria-hidden /> : null}
      {showGlb ? (
        <>
          <model-viewer
            ref={(node) => {
              hostRef.current = node;
            }}
            src={LANDING_ROBOT_GLB}
            poster={LANDING_ROBOT_PNG}
            alt="Robô X09 em 3D de alta qualidade"
            className="x09-mascot-viewer"
          />
          {!loaded ? (
            <div className="x09-mascot-load" aria-hidden>
              <span
                className="x09-mascot-load-bar"
                style={{ transform: `scaleX(${Math.max(progress, 0.06)})` }}
              />
            </div>
          ) : null}
        </>
      ) : (
        <Image
          src={LANDING_ROBOT_PNG}
          alt="Robô X09"
          width={size}
          height={size}
          priority={!compact}
          className="x09-mascot-img"
        />
      )}
    </div>
  );
}
