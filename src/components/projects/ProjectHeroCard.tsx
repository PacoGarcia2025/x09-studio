"use client";

import { useEffect, useRef, useState } from "react";

type ProjectHeroCardProps = {
  projectId: string;
  title: string;
};

/** Miniatura da landing real (mesmo preview do workspace), em escala de print. */
export function ProjectHeroCard({ projectId, title }: ProjectHeroCardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-zinc-100 shadow-[0_12px_40px_rgba(0,0,0,0.25)] ring-1 ring-white/10 transition group-hover:-translate-y-0.5 group-hover:ring-violet-400/30"
    >
      {visible ? (
        <iframe
          title={`Landing de ${title}`}
          src={`/projects/${projectId}/card-frame`}
          loading="lazy"
          className="pointer-events-none absolute left-0 top-0 h-[250%] w-[250%] origin-top-left scale-[0.4] border-0 bg-white"
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-100" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.04] to-transparent" />
    </div>
  );
}
