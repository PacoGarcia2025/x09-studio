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
  variant = "dark",
  inputId,
}: {
  buildMode: BuildMode;
  onBuildModeChange: (mode: BuildMode) => void;
  onSubmitPrompt: (prompt: string) => Promise<void> | void;
  isGenerating?: boolean;
  onStop?: () => void;
  placeholder?: string;
  large?: boolean;
  /** `lovable` = barra branca estilo Lovable home */
  variant?: "dark" | "lovable";
  inputId?: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [modeOpen, setModeOpen] = useState(false);
  const isLovable = variant === "lovable";

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
          "relative overflow-visible transition",
          isLovable
            ? cn(
                "rounded-[28px] border border-white/70 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.18)]",
                large && "p-3",
              )
            : cn(
                "rounded-2xl border border-[#27272A] bg-[#1A1A1F]/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl focus-within:border-violet-500/50",
                large && "p-3.5",
              ),
        )}
      >
        <div
          className={cn(
            "flex gap-2",
            large && !isLovable ? "items-start" : "items-end",
            isLovable && "items-center",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Anexar"
            className={cn(
              "h-10 w-10 shrink-0 rounded-full",
              isLovable
                ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                : "mt-1 text-zinc-400 hover:bg-white/5 hover:text-white",
            )}
            title="Anexos (em breve)"
          >
            <Plus className="h-5 w-5" />
          </Button>

          <Textarea
            id={inputId}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            disabled={isGenerating}
            className={cn(
              "flex-1 resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0",
              isLovable
                ? cn(
                    "min-h-[48px] py-3 text-base text-zinc-900 placeholder:text-zinc-400",
                    large && "min-h-[52px] text-[17px] leading-7",
                  )
                : cn(
                    "min-h-[56px] py-3 text-base text-[#F8FAFC] placeholder:text-slate-500",
                    large && "min-h-[124px] text-lg leading-8",
                  ),
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSubmit(e);
              }
            }}
          />

          {isLovable ? (
            <div className="flex shrink-0 items-center gap-1.5 pr-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setModeOpen((v) => !v)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  {buildMode === "build" ? "Construir" : "Planejar"}
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
                {modeOpen ? (
                  <div className="absolute bottom-full right-0 z-30 mb-2 min-w-[140px] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl">
                    {(["build", "plan"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          onBuildModeChange(mode);
                          setModeOpen(false);
                        }}
                        className={cn(
                          "block w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition",
                          buildMode === mode
                            ? "bg-violet-50 text-violet-700"
                            : "text-zinc-600 hover:bg-zinc-50",
                        )}
                      >
                        {mode === "build" ? "Construir" : "Planejar"}
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
                className="h-10 w-10 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                title="Em breve"
              >
                <Mic className="h-4 w-4" />
              </Button>

              {!isLovable || prompt.trim() || isGenerating ? (
                <Button
                  type="submit"
                  size="icon"
                  aria-label={isGenerating ? "Parar" : "Enviar"}
                  className="h-10 w-10 rounded-full bg-violet-600 text-white hover:bg-violet-700"
                >
                  {isGenerating ? (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {!isLovable ? (
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
                          ? "bg-violet-600/25 text-violet-100"
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
              className="h-10 w-10 rounded-full bg-violet-600 text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] hover:bg-violet-700"
            >
              {isGenerating ? (
                <Square className="h-3.5 w-3.5 fill-current" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </form>
  );
}
