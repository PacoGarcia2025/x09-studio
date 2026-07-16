import { SandpackProvider } from "@codesandbox/sandpack-react";
import { GitBranch, Rocket, Share2 } from "lucide-react";
import { useMemo } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { ConsoleRender } from "@/components/workspace/ConsoleRender";
import { PreviewRender } from "@/components/workspace/PreviewRender";
import { toSandpackFiles } from "@/components/workspace/sandpack-files";
import { Timeline } from "@/components/workspace/Timeline";
import { useStudioStore } from "@/store/studio-store";

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
  const files = useStudioStore((state) => state.files);
  const sandpackFiles = useMemo(() => toSandpackFiles(files), [files]);

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

      <SandpackProvider
        template="react-ts"
        theme="dark"
        files={sandpackFiles}
        options={{
          activeFile: "/App.tsx",
          visibleFiles: ["/App.tsx"],
        }}
      >
        <div className="min-h-0 flex-1">
          <TabsContent value="preview" className="h-full min-h-0">
            <PreviewRender />
          </TabsContent>
          <TabsContent value="code" className="h-full min-h-0">
            <CodeEditor />
          </TabsContent>
          <TabsContent value="console" className="h-full min-h-0">
            <ConsoleRender />
          </TabsContent>
        </div>
      </SandpackProvider>

      <Timeline />
    </Tabs>
  );
}
