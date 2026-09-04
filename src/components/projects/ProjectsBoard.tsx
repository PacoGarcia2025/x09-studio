"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProjectHeroCard } from "@/components/projects/ProjectHeroCard";
import { projectCreatePath } from "@/lib/auth/paths";
import type { Project } from "@/lib/projects/types";

type Tab = "mine" | "recent" | "templates";

type Template = {
  title: string;
  description: string;
  hue: number;
  prompt: string;
  image?: string;
};

export function ProjectsBoard({
  projects,
  templates,
}: {
  projects: Project[];
  templates: readonly Template[];
}) {
  const [tab, setTab] = useState<Tab>(projects.length ? "mine" : "templates");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tab === "recent" ? projects.slice(0, 6) : projects;
    if (!q) return list;
    return list.filter((project) => project.name.toLowerCase().includes(q));
  }, [projects, query, tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "mine", label: "Meus projetos" },
    { id: "recent", label: "Recentes" },
    { id: "templates", label: "Modelos X09" },
  ];

  return (
    <div className="x09-card mx-auto min-h-[420px] max-w-[1120px] rounded-[28px] px-4 py-5 md:px-6 md:py-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-3.5 py-2 text-sm font-medium ${
                tab === item.id
                  ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/25"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {tab !== "templates" && projects.length > 0 ? (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar por nome"
            className="x09-input ml-auto w-full rounded-full px-3.5 py-2 text-sm sm:max-w-[220px]"
          />
        ) : (
          <Link
            href="/billing"
            className="ml-auto text-sm font-medium text-violet-300 transition hover:text-violet-200"
          >
            Planos →
          </Link>
        )}
      </div>

      {tab === "templates" || (projects.length === 0 && tab !== "mine") ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link
              key={template.title}
              href={projectCreatePath(template.prompt)}
              className="group text-left"
            >
              <HeroPreview
                title={template.title}
                subtitle={template.description}
                hue={template.hue}
                image={template.image}
              />
              <CardMeta
                title={template.title}
                subtitle={template.description}
                hue={template.hue}
              />
            </Link>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-500">
          {query.trim()
            ? "Nenhum projeto com esse nome."
            : "Ainda não há projetos. Use um modelo X09 para começar."}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const hue = hashHue(project.id);
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group text-left"
              >
                <ProjectHeroCard projectId={project.id} title={project.name} />
                <CardMeta
                  title={project.name}
                  subtitle={`Atualizado ${formatCreated(project.updated_at)}`}
                  hue={hue}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HeroPreview({
  title,
  subtitle,
  hue,
  image,
}: {
  title: string;
  subtitle?: string;
  hue: number;
  image?: string;
}) {
  const short = title.length > 28 ? `${title.slice(0, 26)}…` : title;

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-zinc-100 shadow-[0_12px_40px_rgba(0,0,0,0.25)] ring-1 ring-white/10 transition group-hover:-translate-y-0.5 group-hover:ring-violet-400/30">
      {image ? (
        <Image
          src={image}
          alt={title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(145deg, hsl(${hue} 72% 58%), hsl(${(hue + 55) % 360} 78% 52%), hsl(${(hue + 110) % 360} 65% 45%))`,
          }}
        >
          <div className="absolute inset-x-3 top-3 overflow-hidden rounded-xl bg-white/95 shadow-lg shadow-black/10">
            <div className="flex items-center gap-1.5 border-b border-zinc-100 px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              <span className="ml-2 h-1.5 flex-1 rounded-full bg-zinc-100" />
            </div>
            <div className="space-y-2.5 px-4 pb-4 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold text-zinc-800">
                  {short.split(" ")[0] || "App"}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[8px] font-semibold text-white"
                  style={{ background: `hsl(${hue} 70% 45%)` }}
                >
                  Começar
                </span>
              </div>
              <p className="text-[11px] font-bold leading-tight tracking-tight text-zinc-900">
                {short}
              </p>
              {subtitle ? (
                <p className="line-clamp-2 text-[9px] leading-snug text-zinc-500">
                  {subtitle}
                </p>
              ) : null}
              <div
                className="mt-1 h-10 rounded-lg opacity-90"
                style={{
                  background: `linear-gradient(90deg, hsl(${hue} 65% 92%), hsl(${(hue + 40) % 360} 70% 88%))`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardMeta({
  title,
  subtitle,
  hue,
}: {
  title: string;
  subtitle: string;
  hue: number;
}) {
  return (
    <div className="mt-3 flex items-center gap-2.5 px-0.5">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 70% 48%), hsl(${hue + 40} 80% 55%))`,
        }}
      >
        {title.trim().charAt(0).toUpperCase() || "A"}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-white">{title}</p>
        <p className="text-[12px] text-zinc-500">{subtitle}</p>
      </div>
    </div>
  );
}

function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function formatCreated(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "agora";
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia${days > 1 ? "s" : ""}`;
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
