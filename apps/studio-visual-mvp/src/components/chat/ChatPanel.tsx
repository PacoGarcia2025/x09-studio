import { ArrowUp, Bot, Loader2, Paperclip, Sparkles, Square, User, Wand2 } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { MODE_LABELS } from "@/lib/api";
import { hasVisibleChatProse, stripCodeFencesForChat } from "@/lib/chat-display";
import { cn } from "@/lib/utils";
import { useStudioStore, type ChatMessage } from "@/store/studio-store";

export function ChatPanel() {
  const [prompt, setPrompt] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useStudioStore((state) => state.messages);
  const isGenerating = useStudioStore((state) => state.isGenerating);
  const sendMessage = useStudioStore((state) => state.sendMessage);
  const generationPreference = useStudioStore(
    (state) => state.generationPreference,
  );
  const setGenerationPreference = useStudioStore(
    (state) => state.setGenerationPreference,
  );
  const lastResolvedMode = useStudioStore((state) => state.lastResolvedMode);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGenerating || !prompt.trim()) return;

    const currentPrompt = prompt;
    setPrompt("");
    await sendMessage(currentPrompt);
  }

  return (
    <aside className="relative z-10 flex h-full min-w-0 max-w-full flex-col overflow-hidden bg-surface">
      <div className="border-b border-border px-4 py-4">
        <p className="text-xs uppercase tracking-[0.24em] text-secondary">
          AI Chat
        </p>
        <h2 className="mt-1 text-lg font-semibold text-primary">
          Construa conversando
        </h2>
        {lastResolvedMode ? (
          <p className="mt-1 text-xs text-secondary">
            Último roteamento: {MODE_LABELS[lastResolvedMode]}
          </p>
        ) : null}
      </div>

      <ScrollArea className="min-w-0 flex-1">
        <div className="min-w-0 space-y-5 overflow-x-hidden p-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={
                isGenerating &&
                message.role === "ai" &&
                message.id === messages[messages.length - 1]?.id
              }
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={onSubmit} className="border-t border-border p-4">
        <div className="rounded-2xl border border-border bg-background p-2 shadow-glow">
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Peça para o X09 criar ou alterar algo..."
            className="min-h-24 border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
            disabled={isGenerating}
          />
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label="Anexar arquivo">
                <Paperclip className="h-4 w-4" />
              </Button>
              <div className="flex items-center rounded-full border border-border bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setGenerationPreference("auto")}
                  disabled={isGenerating}
                  aria-pressed={generationPreference === "auto"}
                  title="X09 escolhe: Groq (edição), Gemini (criação) ou Claude (premium)"
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                    generationPreference === "auto"
                      ? "bg-primary/10 text-primary"
                      : "text-secondary hover:text-primary",
                  )}
                >
                  <Wand2 className="h-3 w-3" />
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setGenerationPreference("premium")}
                  disabled={isGenerating}
                  aria-pressed={generationPreference === "premium"}
                  title="Força Claude Sonnet"
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                    generationPreference === "premium"
                      ? "bg-primary/10 text-primary"
                      : "text-secondary hover:text-primary",
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  Premium
                </button>
              </div>
            </div>
            <Button
              type={isGenerating ? "button" : "submit"}
              size="icon"
              aria-label={isGenerating ? "Parar geração" : "Enviar prompt"}
            >
              {isGenerating ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </form>
    </aside>
  );
}

function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";
  const prose = isUser ? message.content : stripCodeFencesForChat(message.content);
  const showActivity = isStreaming && !hasVisibleChatProse(message.content);
  const showWorkingBadge = isStreaming && hasVisibleChatProse(message.content);

  return (
    <div className={cn("flex min-w-0 gap-3", isUser && "justify-end")}>
      {!isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-accent">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}

      <div
        className={cn(
          "min-w-0 max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6",
          isUser
            ? "bg-accent text-white"
            : "border border-border bg-background text-primary",
        )}
      >
        <div className="min-w-0 break-words whitespace-pre-wrap">
          {isUser ? (
            prose
          ) : showActivity ? (
            <GeneratingStatus />
          ) : prose ? (
            <>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 break-words last:mb-0">{children}</p>
                  ),
                  // Código nunca aparece no chat — só texto
                  pre: () => null,
                  code: ({ children }) => (
                    <span className="font-medium text-accent">{children}</span>
                  ),
                }}
              >
                {prose}
              </ReactMarkdown>
              {showWorkingBadge ? <GeneratingStatus compact /> : null}
            </>
          ) : isStreaming ? (
            <GeneratingStatus />
          ) : (
            "Pronto. Confira o resultado no Preview."
          )}
        </div>
      </div>

      {isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <User className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );
}

function GeneratingStatus({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-secondary",
        compact ? "mt-3 border-t border-border pt-3" : "",
      )}
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
      <div className="min-w-0">
        <p className="text-sm text-primary">
          {compact ? "Gerando a interface…" : "Criando sua experiência…"}
        </p>
        {!compact ? (
          <p className="text-xs text-secondary">
            Montando layout, tipografia e animações no Preview.
          </p>
        ) : null}
      </div>
      <span className="ml-auto flex gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
      </span>
    </div>
  );
}
