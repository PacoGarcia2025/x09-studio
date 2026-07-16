import Editor from "@monaco-editor/react";
import { FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/store/studio-store";

export function CodeEditor() {
  const files = useStudioStore((state) => state.files);
  const activeFile = useStudioStore((state) => state.activeFile);
  const setActiveFile = useStudioStore((state) => state.setActiveFile);
  const updateFile = useStudioStore((state) => state.updateFile);

  const filePaths = Object.keys(files);

  return (
    <div className="flex h-full min-h-0 bg-background">
      <aside className="w-48 shrink-0 border-r border-border bg-surface">
        <div className="border-b border-border px-3 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-secondary">
            Files
          </p>
        </div>
        <div className="space-y-1 p-2">
          {filePaths.map((path) => (
            <button
              key={path}
              type="button"
              onClick={() => setActiveFile(path)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition",
                activeFile === path
                  ? "bg-accent text-white"
                  : "text-secondary hover:bg-background hover:text-primary",
              )}
            >
              <FileCode2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{path}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Editor
          theme="vs-dark"
          path={activeFile}
          value={files[activeFile] ?? ""}
          onChange={(value) => updateFile(activeFile, value ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </main>
    </div>
  );
}
