import {
  ArrowUp,
  ChevronDown,
  Mic,
  Plus,
  Square,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BuildMode } from "@/store/studio-store";

export function PromptComposer({
  buildMode,
  onBuildModeChange,
  onSubmitPrompt,
  isGenerating,
  onStop,
  placeholder = "Descreva o app ou landing que você quer criar…",
  large = false,
}: {
  buildMode: BuildMode;
  onBuildModeChange: (mode: BuildMode) => void;
  onSubmitPrompt: (prompt: string) => Promise<void> | void;
  isGenerating?: boolean;
  onStop?: () => void;
  placeholder?: string;
  large?: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [modeOpen, setModeOpen] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (isGenerating) {
      onStop?.();
      return;
    }
    const value = prompt.trim();
    if (!value) return;
    setPrompt("");
    await onSubmitPrompt(value);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="w-full">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-2 shadow-[0_0_20px_rgba(99,102,241,0.12)] backdrop-blur-md",
          large && "p-3",
        )}
      >
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

        <div className={cn("flex gap-2", large ? "items-start" : "items-end")}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Anexar"
            className="mt-1 h-10 w-10 shrink-0 rounded-full text-zinc-400 hover:bg-white/5 hover:text-white"
            title="Anexos (em breve)"
          >
            <Plus className="h-5 w-5" />
          </Button>

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            disabled={isGenerating}
            className={cn(
              "min-h-[56px] flex-1 resize-none border-0 bg-transparent px-1 py-3 text-base text-white shadow-none placeholder:text-zinc-500 focus-visible:ring-0",
              large && "min-h-[112px] text-lg",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSubmit(e);
              }
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-1 pb-1 pt-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setModeOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.08]"
            >
              {buildMode === "build" ? "Build" : "Plan"}
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            </button>
            {modeOpen ? (
              <div className="absolute bottom-full right-0 z-30 mb-2 min-w-[120px] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl backdrop-blur-md">
                {(["build", "plan"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      onBuildModeChange(mode);
                      setModeOpen(false);
                    }}
                    className={cn(
                      "block w-full rounded-lg px-3 py-2 text-left text-xs font-medium capitalize transition",
                      buildMode === mode
                        ? "bg-indigo-500/25 text-indigo-100"
                        : "text-zinc-300 hover:bg-white/5",
                    )}
                  >
                    {mode === "build" ? "Build" : "Plan"}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Microfone"
            className="h-10 w-10 rounded-full text-zinc-400 hover:bg-white/5 hover:text-white"
            title="Em breve"
          >
            <Mic className="h-4 w-4" />
          </Button>

          <Button
            type="submit"
            size="icon"
            aria-label={isGenerating ? "Parar" : "Enviar"}
            className="h-10 w-10 rounded-full bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:bg-indigo-400"
          >
            {isGenerating ? (
              <Square className="h-3.5 w-3.5 fill-current" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
