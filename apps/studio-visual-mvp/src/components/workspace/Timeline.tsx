import { Clock, GitCommitHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/store/studio-store";

export function Timeline() {
  const versions = useStudioStore((state) => state.versions);
  const activeVersionId = useStudioStore((state) => state.activeVersionId);
  const revertToVersion = useStudioStore((state) => state.revertToVersion);

  return (
    <footer className="flex h-12 items-center gap-3 border-t border-border bg-surface px-4">
      <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-secondary">
        <GitCommitHorizontal className="h-4 w-4 text-accent" />
        Timeline
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
                    ? "border-accent bg-accent/20 text-primary"
                    : "border-border bg-background text-secondary hover:border-accent hover:text-primary",
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
    </footer>
  );
}
