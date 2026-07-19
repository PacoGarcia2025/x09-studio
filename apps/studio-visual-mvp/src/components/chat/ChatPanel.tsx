import { Bot, Loader2, User } from "lucide-react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PromptComposer } from "@/components/dashboard/PromptComposer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MODE_LABELS } from "@/lib/api";
import { hasVisibleChatProse, stripCodeFencesForChat } from "@/lib/chat-display";
import { cn } from "@/lib/utils";
import { useStudioStore, type ChatMessage } from "@/store/studio-store";

export function ChatPanel({
  compact = false,
  variant = "dark",
}: {
  compact?: boolean;
  variant?: "dark" | "lovable";
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useStudioStore((state) => state.messages);
  const isGenerating = useStudioStore((state) => state.isGenerating);
  const sendMessage = useStudioStore((state) => state.sendMessage);
  const stopGeneration = useStudioStore((state) => state.stopGeneration);
  const lastResolvedMode = useStudioStore((state) => state.lastResolvedMode);
  const agentPhaseLabel = useStudioStore((state) => state.agentPhaseLabel);
  const buildMode = useStudioStore((state) => state.buildMode);
  const setBuildMode = useStudioStore((state) => state.setBuildMode);
  const metrics = useStudioStore((state) => state.metrics);
  const isLovable = variant === "lovable";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating, agentPhaseLabel]);

  return (
    <aside
      className={cn(
        "relative z-10 flex h-full min-w-0 max-w-full flex-col overflow-hidden",
        isLovable
          ? "bg-white"
          : compact
            ? "bg-transparent"
            : "bg-surface",
      )}
    >
      {!isLovable ? (
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-secondary">
            Chat
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-primary">
            Construa conversando
          </h2>
          {lastResolvedMode ? (
            <p className="mt-1 text-[11px] text-secondary">
              {MODE_LABELS[lastResolvedMode]}
            </p>
          ) : null}
          {agentPhaseLabel ? (
            <p className="mt-0.5 text-[11px] text-violet-300">
              {agentPhaseLabel}
              {metrics?.repairCycles ? ` · repairs ${metrics.repairCycles}` : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="border-b border-zinc-100 px-4 py-3">
          <p className="text-sm font-semibold text-zinc-900">Chat X09</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {agentPhaseLabel ||
              (lastResolvedMode
                ? MODE_LABELS[lastResolvedMode]
                : "Peça mudanças e o preview atualiza")}
          </p>
        </div>
      )}

      <ScrollArea className="min-w-0 flex-1">
        <div className="min-w-0 space-y-4 overflow-x-hidden p-3">
          {messages.length === 0 && isLovable ? (
            <p className="px-2 py-6 text-center text-sm text-zinc-400">
              Descreva o que quer criar ou alterar. O X09 constrói e mostra o
              preview ao lado.
            </p>
          ) : null}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              lovable={isLovable}
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

      <div
        className={cn(
          "p-3",
          isLovable ? "border-t border-zinc-100 bg-white" : "border-t border-white/10",
        )}
      >
        <PromptComposer
          buildMode={buildMode}
          onBuildModeChange={setBuildMode}
          onSubmitPrompt={sendMessage}
          isGenerating={isGenerating}
          onStop={stopGeneration}
          variant={isLovable ? "lovable" : "dark"}
          placeholder={
            isLovable
              ? "Pergunte ao X09…"
              : "Peça uma alteração ou um novo bloco…"
          }
        />
      </div>
    </aside>
  );
}

function MessageBubble({
  message,
  isStreaming = false,
  lovable = false,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
  lovable?: boolean;
}) {
  const isUser = message.role === "user";
  const prose = isUser
    ? message.content
    : stripCodeFencesForChat(message.content);
  const showActivity = isStreaming && !hasVisibleChatProse(message.content);
  const showWorkingBadge = isStreaming && hasVisibleChatProse(message.content);

  return (
    <div
      className={cn(
        "flex gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full",
          lovable
            ? isUser
              ? "bg-zinc-900 text-white"
              : "bg-violet-100 text-violet-700"
            : isUser
              ? "bg-white/10 text-zinc-200"
              : "bg-violet-600/20 text-violet-200",
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </span>
      <div
        className={cn(
          "min-w-0 max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-6",
          lovable
            ? isUser
              ? "bg-zinc-900 text-white"
              : "bg-zinc-50 text-zinc-800 ring-1 ring-zinc-100"
            : isUser
              ? "bg-white/10 text-zinc-100"
              : "bg-white/[0.04] text-zinc-200",
        )}
      >
        {showActivity ? (
          <p
            className={cn(
              "flex items-center gap-2 text-xs",
              lovable ? "text-zinc-500" : "text-violet-200",
            )}
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Trabalhando…
          </p>
        ) : (
          <div
            className={cn(
              "prose prose-sm max-w-none break-words",
              lovable
                ? "prose-zinc prose-p:my-1.5 prose-ul:my-1.5"
                : "prose-invert prose-p:my-1.5",
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{prose}</ReactMarkdown>
          </div>
        )}
        {showWorkingBadge ? (
          <p
            className={cn(
              "mt-2 flex items-center gap-1.5 text-[11px]",
              lovable ? "text-violet-600" : "text-violet-300",
            )}
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Gerando…
          </p>
        ) : null}
      </div>
    </div>
  );
}
