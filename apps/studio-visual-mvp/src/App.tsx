import { Code2, GitBranch, Rocket, Share2, Terminal, Monitor } from "lucide-react";
import type { ReactNode } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function App() {
  return (
    <div className="min-h-screen bg-background text-primary">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-xs font-bold text-white shadow-glow">
            X09
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">studio.x09</p>
            <p className="mt-1 text-xs text-secondary">AI visual builder</p>
          </div>
        </div>
        <Avatar>
          <AvatarFallback>S</AvatarFallback>
        </Avatar>
      </header>

      <ResizablePanelGroup
        direction="horizontal"
        className="h-[calc(100vh-3.5rem)]"
      >
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <ChatPanel />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <WorkspacePanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function WorkspacePanel() {
  return (
    <Tabs defaultValue="preview" className="flex h-full flex-col bg-background">
      <div className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="console">Console</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Rocket className="h-4 w-4" />
            Deploy
          </Button>
          <Button variant="outline" size="sm">
            <GitBranch className="h-4 w-4" />
            GitHub Sync
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      <TabsContent value="preview" className="flex flex-1 items-center justify-center">
        <WorkspacePlaceholder
          icon={<Monitor className="h-10 w-10" />}
          title="Preview em tempo real"
          description="Aqui o Sandpack renderizará o app gerado conforme os arquivos virtuais mudarem."
        />
      </TabsContent>
      <TabsContent value="code" className="flex flex-1 items-center justify-center">
        <WorkspacePlaceholder
          icon={<Code2 className="h-10 w-10" />}
          title="Editor de código"
          description="A próxima etapa adiciona File Explorer e Monaco Editor sincronizados ao Zustand."
        />
      </TabsContent>
      <TabsContent value="console" className="flex flex-1 items-center justify-center">
        <WorkspacePlaceholder
          icon={<Terminal className="h-10 w-10" />}
          title="Console"
          description="Logs de build, preview e geração aparecerão aqui sem expor complexidade ao usuário final."
        />
      </TabsContent>
    </Tabs>
  );
}

function WorkspacePlaceholder({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-glow">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-border bg-background text-accent">
        {icon}
      </div>
      <h2 className="mt-5 text-xl font-semibold text-primary">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-secondary">{description}</p>
    </div>
  );
}
