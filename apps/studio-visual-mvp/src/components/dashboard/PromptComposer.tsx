import {
  ArrowUp,
  ChevronDown,
  Film,
  Loader2,
  Mic,
  Plus,
  Square,
  X,
} from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { uploadChatAttachment, UploadError } from "@/lib/uploads";
import type { BuildMode } from "@/store/studio-store";

type PendingAttachment = {
  id: string;
  file: File;
  previewUrl: string | null;
  kind: "image" | "video";
};

const ACCEPTED_TYPES = "image/*,video/*";

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
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLovable = variant === "lovable";

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
    );
    if (!files.length) return;
    setAttachments((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
        kind: (file.type.startsWith("video/") ? "video" : "image") as
          | "image"
          | "video",
      })),
    ]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const found = prev.find((a) => a.id === id);
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (isGenerating) {
      onStop?.();
      return;
    }
    const value = prompt.trim();
    if (!value && attachments.length === 0) return;

    let attachmentsNote = "";
    if (attachments.length > 0) {
      setIsUploading(true);
      try {
        const uploaded = await Promise.all(
          attachments.map((a) => uploadChatAttachment(a.file)),
        );
        attachmentsNote = `\n\n[Anexos enviados pelo usuário — use estes arquivos reais no projeto quando fizer sentido:\n${uploaded
          .map((u) => `- ${u.name} (${u.kind}): ${u.url}`)
          .join("\n")}]`;
      } catch (error) {
        setIsUploading(false);
        const message =
          error instanceof UploadError ? error.message : "Falha ao enviar anexos.";
        window.alert(message);
        return;
      }
      setIsUploading(false);
    }

    setPrompt("");
    attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
    await onSubmitPrompt(value + attachmentsNote);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative overflow-visible transition",
          isDraggingOver && "ring-2 ring-violet-500/70",
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
        {attachments.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-1 pb-2 pt-1">
            {attachments.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg",
                  isLovable ? "bg-zinc-100" : "bg-white/5",
                )}
                title={a.file.name}
              >
                {a.previewUrl ? (
                  <img
                    src={a.previewUrl}
                    alt={a.file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Film
                    className={cn(
                      "h-5 w-5",
                      isLovable ? "text-zinc-400" : "text-zinc-500",
                    )}
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  aria-label="Remover anexo"
                  className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

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
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "h-10 w-10 shrink-0 rounded-full",
              isLovable
                ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                : "mt-1 text-zinc-400 hover:bg-white/5 hover:text-white",
            )}
            title="Anexar imagem ou vídeo"
          >
            <Plus className="h-5 w-5" />
          </Button>

          <Textarea
            id={inputId}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            disabled={isGenerating || isUploading}
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

              {!isLovable || prompt.trim() || isGenerating || attachments.length > 0 ? (
                <Button
                  type="submit"
                  size="icon"
                  disabled={isUploading}
                  aria-label={isGenerating ? "Parar" : "Enviar"}
                  className="h-10 w-10 rounded-full bg-violet-600 text-white hover:bg-violet-700"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isGenerating ? (
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
              disabled={isUploading}
              aria-label={isGenerating ? "Parar" : "Enviar"}
              className="h-10 w-10 rounded-full bg-violet-600 text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] hover:bg-violet-700"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isGenerating ? (
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
