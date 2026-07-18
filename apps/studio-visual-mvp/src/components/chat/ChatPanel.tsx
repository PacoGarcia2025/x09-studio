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

export function ChatPanel({ compact = false }: { compact?: boolean }) {
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating, agentPhaseLabel]);

  return (
    <aside
      className={cn(
        "relative z-10 flex h-full min-w-0 max-w-full flex-col overflow-hidden",
        compact ? "bg-transparent" : "bg-surface",
      )}
    >
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
          <p className="mt-0.5 text-[11px] text-indigo-300">
            {agentPhaseLabel}
            {metrics?.repairCycles ? ` · repairs ${metrics.repairCycles}` : ""}
          </p>
        ) : null}
      </div>

      <ScrollArea className="min-w-0 flex-1">
        <div className="min-w-0 space-y-4 overflow-x-hidden p-3">
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

      <div className="border-t border-white/10 p-3">
        <PromptComposer
          buildMode={buildMode}
          onBuildModeChange={setBuildMode}
          onSubmitPrompt={sendMessage}
          isGenerating={isGenerating}
          onStop={stopGeneration}
          placeholder="Peça uma alteração ou um novo bloco…"
        />
      </div>
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
  const prose = isUser
    ? message.content
    : stripCodeFencesForChat(message.content);
  const showActivity = isStreaming && !hasVisibleChatProse(message.content);
  const showWorkingBadge = isStreaming && hasVisibleChatProse(message.content);

  return (
    <div className={cn("flex min-w-0 gap-2.5", isUser && "justify-end")}>
      {!isUser ? (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 text-indigo-300">
          <Bot className="h-3.5 w-3.5" />
        </div>
      ) : null}

      <div
        className={cn(
          "min-w-0 max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6",
          isUser
            ? "bg-indigo-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.25)]"
            : "border border-white/10 bg-white/[0.03] text-primary backdrop-blur-md",
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
                  pre: () => null,
                  code: ({ children }) => (
                    <span className="font-medium text-cyan-200">{children}</span>
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
            "Pronto. Confira o Preview."
          )}
        </div>
      </div>

      {isUser ? (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-zinc-950">
          <User className="h-3.5 w-3.5" />
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
        compact ? "mt-3 border-t border-white/10 pt-3" : "",
      )}
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-300" />
      <div className="min-w-0">
        <p className="text-sm text-primary">
          {compact ? "Gerando…" : "Criando sua experiência…"}
        </p>
        {!compact ? (
          <p className="text-xs text-secondary">
            Layout, motion e preview em tempo real.
          </p>
        ) : null}
      </div>
    </div>
  );
}
