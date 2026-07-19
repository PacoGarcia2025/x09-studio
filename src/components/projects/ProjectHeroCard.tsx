"use client";

type ProjectHeroCardProps = {
  projectId: string;
  title: string;
};

/** Preview real da hero via iframe do HTML gerado a partir dos arquivos do projeto. */
export function ProjectHeroCard({ projectId, title }: ProjectHeroCardProps) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80 transition group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
      <iframe
        title={`Hero de ${title}`}
        src={`/api/projects/${projectId}/card-preview`}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
        className="pointer-events-none absolute left-0 top-0 h-[250%] w-[250%] origin-top-left scale-[0.4] border-0 bg-white"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.04] to-transparent" />
    </div>
  );
}
