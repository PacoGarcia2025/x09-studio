"use client";

type ProjectHeroCardProps = {
  projectId: string;
  title: string;
};

/** Preview real da hero via iframe do HTML gerado a partir dos arquivos do projeto. */
export function ProjectHeroCard({ projectId, title }: ProjectHeroCardProps) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#0b0b12] shadow-[0_12px_40px_rgba(0,0,0,0.25)] ring-1 ring-white/10 transition group-hover:-translate-y-0.5 group-hover:ring-violet-400/30">
      <iframe
        title={`Hero de ${title}`}
        src={`/api/projects/${projectId}/card-preview`}
        loading="lazy"
        sandbox=""
        className="pointer-events-none absolute left-0 top-0 h-[250%] w-[250%] origin-top-left scale-[0.4] border-0"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.04] to-transparent" />
    </div>
  );
}
