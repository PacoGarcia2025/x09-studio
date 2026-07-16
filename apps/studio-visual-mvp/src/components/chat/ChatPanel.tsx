import { ArrowUp, Bot, Paperclip, Square, User } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useStudioStore, type ChatMessage } from "@/store/studio-store";

export function ChatPanel() {
  const [prompt, setPrompt] = useState("");
  const messages = useStudioStore((state) => state.messages);
  const isGenerating = useStudioStore((state) => state.isGenerating);
  const sendMessage = useStudioStore((state) => state.sendMessage);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGenerating || !prompt.trim()) return;

    const currentPrompt = prompt;
    setPrompt("");
    await sendMessage(currentPrompt);
  }

  return (
    <aside className="flex h-full flex-col bg-surface">
      <div className="border-b border-border px-4 py-4">
        <p className="text-xs uppercase tracking-[0.24em] text-secondary">
          AI Chat
        </p>
        <h2 className="mt-1 text-lg font-semibold text-primary">
          Construa conversando
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isGenerating ? <ThinkingBubble /> : null}
        </div>
      </ScrollArea>

      <form onSubmit={onSubmit} className="border-t border-border p-4">
        <div className="rounded-2xl border border-border bg-background p-2 shadow-glow">
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Peça para o X09 criar ou alterar algo..."
            className="min-h-24 border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" size="icon" aria-label="Anexar arquivo">
              <Paperclip className="h-4 w-4" />
            </Button>
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "justify-end")}>
      {!isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-accent">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6",
          isUser
            ? "bg-accent text-white"
            : "border border-border bg-background text-primary",
        )}
      >
        {message.content}
      </div>
      {isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <User className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-accent">
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-secondary">
        <span className="mr-2">X09 pensando</span>
        <span className="inline-flex gap-1 align-middle">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.2s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.1s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
        </span>
      </div>
    </div>
  );
}
