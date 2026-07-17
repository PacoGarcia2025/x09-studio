import { SandpackProvider } from "@codesandbox/sandpack-react";
import {
  FolderOpen,
  GitBranch,
  Loader2,
  LogOut,
  Plus,
  Rocket,
  Save,
  Share2,
  User,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { UserProfileModal } from "@/components/profile/UserProfileModal";
import { MyProjectsModal } from "@/components/projects/MyProjectsModal";
import { DeployPublishModal } from "@/components/projects/DeployPublishModal";
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
import { SandpackErrorBridge } from "@/components/workspace/SandpackErrorBridge";
import { toSandpackFiles } from "@/components/workspace/sandpack-files";
import { sandpackCustomSetup } from "@/components/workspace/sandpack-setup";
import { Timeline } from "@/components/workspace/Timeline";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";
import { useStudioStore } from "@/store/studio-store";
import { useUserStore } from "@/store/user-store";

export default function App() {
  const session = useUserStore((state) => state.session);
  const name = useUserStore((state) => state.name);
  const setSession = useUserStore((state) => state.setSession);
  const fetchProfile = useUserStore((state) => state.fetchProfile);
  const clearUser = useUserStore((state) => state.clearUser);
  const signOut = useUserStore((state) => state.signOut);

  const createNewProject = useProjectStore((state) => state.createNewProject);
  const saveProject = useProjectStore((state) => state.saveProject);
  const isSaving = useProjectStore((state) => state.isSaving);
  const currentProjectName = useProjectStore((state) => state.currentProjectName);
  const lastSavedAt = useProjectStore((state) => state.lastSavedAt);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const isGenerating = useStudioStore((state) => state.isGenerating);
  const wasGeneratingRef = useRef(false);

  const isLoggedIn = Boolean(session?.user);
  const avatarLabel = (name || session?.user?.email || "S")
    .trim()
    .charAt(0)
    .toUpperCase();

  // Auto-save quando a IA termina de gerar
  useEffect(() => {
    if (wasGeneratingRef.current && !isGenerating && isLoggedIn) {
      void saveProject();
    }
    wasGeneratingRef.current = isGenerating;
  }, [isGenerating, isLoggedIn, saveProject]);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        void fetchProfile();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        void fetchProfile();
      } else {
        clearUser();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, fetchProfile, clearUser]);

  async function handleSave() {
    if (!isLoggedIn) {
      setIsAuthOpen(true);
      return;
    }

    const result = await saveProject();
    if (result.error) {
      setSaveMessage(result.error);
      return;
    }

    setSaveMessage("Projeto salvo!");
    window.setTimeout(() => setSaveMessage(null), 2500);
  }

  function handleNewProject() {
    createNewProject();
    setSaveMessage(null);
  }

  return (
    <div className="flex h-screen flex-col bg-background text-primary">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <button
          type="button"
          onClick={handleNewProject}
          className="flex min-w-0 items-center gap-3 rounded-xl text-left transition hover:opacity-90"
          title="Novo Projeto"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-xs font-bold text-white shadow-glow">
            X09
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none">studio.x09</p>
            <p className="mt-1 truncate text-xs text-secondary">
              {currentProjectName || "AI visual builder"}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNewProject}>
            <Plus className="h-4 w-4" />
            Novo Projeto
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isLoggedIn) {
                setIsAuthOpen(true);
                return;
              }
              setIsProjectsOpen(true);
            }}
          >
            <FolderOpen className="h-4 w-4" />
            Meus Projetos
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => void handleSave()}
            title={
              lastSavedAt
                ? `Último save: ${new Date(lastSavedAt).toLocaleTimeString("pt-BR")}`
                : "Salvar no Supabase"
            }
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Salvando…" : "Salvar Projeto"}
          </Button>

          {saveMessage ? (
            <span
              className={cn(
                "hidden text-xs sm:inline",
                saveMessage === "Projeto salvo!"
                  ? "text-emerald-400"
                  : "text-red-300",
              )}
            >
              {saveMessage}
            </span>
          ) : null}

          {isLoggedIn ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProfileOpen(true)}
              >
                <User className="h-4 w-4" />
                Meu Perfil
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void signOut()}
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
              <Avatar>
                <AvatarFallback>{avatarLabel}</AvatarFallback>
              </Avatar>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsAuthOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-glow hover:from-violet-500 hover:to-fuchsia-500"
            >
              <User className="h-4 w-4" />
              Entrar
            </Button>
          )}
        </div>
      </header>

      <AuthModal open={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <UserProfileModal
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <MyProjectsModal
        open={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
      />
      <DeployPublishModal
        open={isDeployOpen}
        onClose={() => setIsDeployOpen(false)}
      />

      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-0 w-full flex-1 overflow-hidden"
      >
        <ResizablePanel
          id="chat"
          defaultSize="32"
          minSize="22"
          maxSize="45"
          className="min-w-0 overflow-hidden"
        >
          <div className="relative z-20 h-full min-w-0 overflow-hidden border-r border-border bg-surface">
            <ChatPanel />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="z-30" />
        <ResizablePanel
          id="workspace"
          defaultSize="68"
          minSize="55"
          className="min-w-0 overflow-hidden"
        >
          <div className="relative z-0 h-full min-w-0 overflow-hidden bg-background">
            <WorkspacePanel
              onSave={() => void handleSave()}
              isSaving={isSaving}
              onDeploy={() => setIsDeployOpen(true)}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function WorkspacePanel({
  onSave,
  isSaving,
  onDeploy,
}: {
  onSave: () => void;
  isSaving: boolean;
  onDeploy: () => void;
}) {
  const files = useStudioStore((state) => state.files);
  const activeFile = useStudioStore((state) => state.activeFile);
  const sandpackFiles = useMemo(() => toSandpackFiles(files), [files]);
  const visibleFiles = useMemo(() => {
    const paths = Object.keys(files)
      .filter(
        (p) =>
          !p.startsWith("/components/ui/") &&
          p !== "/design-tokens.ts" &&
          p !== "/package.json" &&
          p !== "/lib/mock-data.ts",
      )
      .sort();
    return paths.length > 0 ? paths : ["/App.tsx"];
  }, [files]);

  return (
    <Tabs defaultValue="preview" className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="console">Console</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={onSave}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
          <Button variant="outline" size="sm" onClick={onDeploy}>
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

      <div className="relative min-h-0 w-full min-w-0 flex-1 overflow-hidden">
        <SandpackProvider
          template="react-ts"
          theme="dark"
          files={sandpackFiles}
          style={{
            height: "100%",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            overflow: "hidden",
          }}
          options={{
            activeFile: visibleFiles.includes(activeFile)
              ? activeFile
              : "/App.tsx",
            visibleFiles,
            externalResources: ["https://cdn.tailwindcss.com"],
          }}
          customSetup={sandpackCustomSetup}
        >
          <SandpackErrorBridge />
          <div className="relative h-full w-full min-w-0 overflow-hidden">
            <TabsContent
              value="preview"
              forceMount
              className="absolute inset-0 m-0 mt-0 h-full max-w-full min-h-0 min-w-0 overflow-hidden data-[state=inactive]:hidden"
            >
              <PreviewRender />
            </TabsContent>
            <TabsContent
              value="code"
              className="absolute inset-0 m-0 mt-0 h-full max-w-full min-h-0 min-w-0 overflow-hidden data-[state=inactive]:hidden"
            >
              <CodeEditor />
            </TabsContent>
            <TabsContent
              value="console"
              className="absolute inset-0 m-0 mt-0 h-full max-w-full min-h-0 min-w-0 overflow-hidden data-[state=inactive]:hidden"
            >
              <ConsoleRender />
            </TabsContent>
          </div>
        </SandpackProvider>
      </div>

      <Timeline />
    </Tabs>
  );
}
