import { Clock, GitCommitHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/store/studio-store";

export function Timeline() {
  const versions = useStudioStore((state) => state.versions);
  const activeVersionId = useStudioStore((state) => state.activeVersionId);
  const revertToVersion = useStudioStore((state) => state.revertToVersion);
  const activeIndex = versions.findIndex(
    (version) => version.id === activeVersionId,
  );
  const previousVersion =
    activeIndex > 0
      ? versions[activeIndex - 1]
      : activeIndex === -1 && versions.length > 1
        ? versions[versions.length - 2]
        : null;

  return (
    <footer className="flex h-12 shrink-0 items-center gap-3 border-t border-[#27272A] bg-[#111113]/95 px-4">
      <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-400">
        <GitCommitHorizontal className="h-4 w-4 text-violet-400" />
        Histórico
      </div>

      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {versions.length === 0 ? (
          <p className="text-xs text-secondary">
            As versões aparecerão após a primeira geração do X09.
          </p>
        ) : (
          versions.map((version) => {
            const isActive = activeVersionId === version.id;
            return (
              <button
                key={version.id}
                type="button"
                onClick={() => revertToVersion(version.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
                  isActive
                    ? "border-violet-500/50 bg-violet-600/20 text-violet-100"
                    : "border-[#27272A] bg-[#0A0A0B] text-slate-500 hover:border-violet-500/40 hover:text-slate-200",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                <span className="max-w-28 truncate">{version.prompt.slice(0, 15)}</span>
                <span className="text-[11px] opacity-70">
                  {new Date(version.timestamp).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </button>
            );
          })
        )}
      </div>

      <button
        type="button"
        disabled={!previousVersion}
        onClick={() =>
          previousVersion ? revertToVersion(previousVersion.id) : undefined
        }
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#27272A] px-2.5 text-xs font-medium text-slate-400 transition hover:border-violet-500/40 hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
        title="Voltar para a versão anterior"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span className="hidden xl:inline">Desfazer</span>
      </button>
    </footer>
  );
}
