import { SandpackProvider } from "@codesandbox/sandpack-react";
import {
  ArrowLeft,
  Code2,
  Loader2,
  LogOut,
  Monitor,
  MonitorPlay,
  Rocket,
  Save,
  Smartphone,
  Tablet,
  Terminal,
  User,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { AgentsPanel } from "@/components/agents/AgentsPanel";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ConnectorsPanel } from "@/components/connectors/ConnectorsPanel";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { AppShell } from "@/components/layout/AppShell";
import type { AppNavId } from "@/components/layout/SidebarNav";
import { UserProfileModal } from "@/components/profile/UserProfileModal";
import { DeployPublishModal } from "@/components/projects/DeployPublishModal";
import { MyProjectsModal } from "@/components/projects/MyProjectsModal";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { fetchBillingMe } from "@/lib/api-client";
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
import { Timeline } from "@/components/workspace/Timeline";
import { toSandpackFiles } from "@/components/workspace/sandpack-files";
import { sandpackCustomSetup } from "@/components/workspace/sandpack-setup";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";
import { useStudioStore } from "@/store/studio-store";
import { useUserStore } from "@/store/user-store";

type ShellView = "home" | "studio";

export default function App() {
  const session = useUserStore((state) => state.session);
  const name = useUserStore((state) => state.name);
  const setSession = useUserStore((state) => state.setSession);
  const fetchProfile = useUserStore((state) => state.fetchProfile);
  const clearUser = useUserStore((state) => state.clearUser);
  const signOut = useUserStore((state) => state.signOut);

  const createNewProject = useProjectStore((state) => state.createNewProject);
  const saveProject = useProjectStore((state) => state.saveProject);
  const loadProject = useProjectStore((state) => state.loadProject);
  const fetchUserProjects = useProjectStore((state) => state.fetchUserProjects);
  const projectsList = useProjectStore((state) => state.projectsList);
  const isLoadingList = useProjectStore((state) => state.isLoadingList);
  const isSaving = useProjectStore((state) => state.isSaving);
  const currentProjectName = useProjectStore((state) => state.currentProjectName);

  const sendMessage = useStudioStore((state) => state.sendMessage);
  const stopGeneration = useStudioStore((state) => state.stopGeneration);
  const isGenerating = useStudioStore((state) => state.isGenerating);
  const buildMode = useStudioStore((state) => state.buildMode);
  const setBuildMode = useStudioStore((state) => state.setBuildMode);
  const upgradeRequired = useStudioStore((state) => state.upgradeRequired);
  const clearUpgradeRequired = useStudioStore(
    (state) => state.clearUpgradeRequired,
  );

  const [shellView, setShellView] = useState<ShellView>("home");
  const [nav, setNav] = useState<AppNavId>("dashboard");
  const [projectFilter, setProjectFilter] = useState<"all" | "starred" | "mine">(
    "all",
  );
  const [focusPromptToken, setFocusPromptToken] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const wasGeneratingRef = useRef(false);

  const isLoggedIn = Boolean(session?.user);
  const avatarLabel = (name || session?.user?.email || "S")
    .trim()
    .charAt(0)
    .toUpperCase();

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
      if (data.session) void fetchProfile();
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) void fetchProfile();
      else clearUser();
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, fetchProfile, clearUser]);

  useEffect(() => {
    if (
      isLoggedIn &&
      shellView === "home" &&
      (nav === "dashboard" ||
        nav === "projects" ||
        nav === "starred" ||
        nav === "mine" ||
        nav === "search")
    ) {
      void fetchUserProjects();
    }
  }, [isLoggedIn, shellView, nav, fetchUserProjects]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShellView("home");
        setNav("search");
        setFocusPromptToken((value) => value + 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setCreditBalance(null);
      return;
    }
    void fetchBillingMe()
      .then((snap) => setCreditBalance(snap.wallet.balance))
      .catch(() => setCreditBalance(null));
  }, [isLoggedIn, isGenerating, nav]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("github") === "connected") {
      setNav("connectors");
      setShellView("home");
      setSaveMessage("GitHub conectado!");
      window.setTimeout(() => setSaveMessage(null), 2500);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function handleSave() {
    if (!isLoggedIn) {
      setIsAuthOpen(true);
      return;
    }
    const result = await saveProject();
    setSaveMessage(result.error ?? "Projeto salvo!");
    window.setTimeout(() => setSaveMessage(null), 2500);
  }

  function goHome() {
    setShellView("home");
    setNav("dashboard");
  }

  function handleNewProject() {
    createNewProject();
    setSaveMessage(null);
    goHome();
  }

  async function handleStartFromPrompt(prompt: string) {
    setShellView("studio");
    setNav("dashboard");
    await sendMessage(prompt);
  }

  async function handleOpenProject(id: string) {
    const result = await loadProject(id);
    if (result.error) {
      setSaveMessage(result.error);
      return;
    }
    setShellView("studio");
  }

  function handleNav(id: AppNavId) {
    setNav(id);
    setShellView("home");

    if (id === "dashboard") {
      setProjectFilter("all");
      clearUpgradeRequired();
      return;
    }

    if (id === "search") {
      setProjectFilter("all");
      setFocusPromptToken((value) => value + 1);
      return;
    }

    if (id === "projects") {
      setProjectFilter("all");
      if (!isLoggedIn) setIsAuthOpen(true);
      return;
    }

    if (id === "starred") {
      setProjectFilter("starred");
      if (!isLoggedIn) setIsAuthOpen(true);
      return;
    }

    if (id === "mine") {
      setProjectFilter("mine");
      if (!isLoggedIn) setIsAuthOpen(true);
      return;
    }

    if (id === "resources") {
      return;
    }

    if (id === "connectors" || id === "settings") {
      if (!isLoggedIn) setIsAuthOpen(true);
    }
  }

  const showLovableHome =
    shellView === "home" &&
    (nav === "dashboard" ||
      nav === "search" ||
      nav === "projects" ||
      nav === "starred" ||
      nav === "mine");

  const workspaceLabel = name?.trim()
    ? `${name.trim().split(/\s+/)[0]}'s Studio`
    : "Studio X09";

  const headerActions = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-900">
          {shellView === "studio"
            ? currentProjectName || "Workspace"
            : nav === "resources"
              ? "Resources"
              : nav === "connectors"
                ? "Connectors"
                : nav === "settings"
                  ? "Configurações"
                  : "Dashboard"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isLoggedIn && creditBalance !== null ? (
          <button
            type="button"
            onClick={() => handleNav("settings")}
            className="hidden rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 sm:inline"
            title="Créditos"
          >
            {creditBalance} créditos
          </button>
        ) : null}
        {saveMessage ? (
          <span
            className={cn(
              "hidden text-xs sm:inline",
              saveMessage === "Projeto salvo!" ||
                saveMessage.includes("conectado")
                ? "text-emerald-600"
                : "text-red-600",
            )}
          >
            {saveMessage}
          </span>
        ) : null}
        {isLoggedIn ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-zinc-600"
              onClick={() => setIsProfileOpen(true)}
              title="Perfil"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-violet-100 text-violet-700">
                  {avatarLabel}
                </AvatarFallback>
              </Avatar>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-600"
              onClick={() => void signOut()}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={() => setIsAuthOpen(true)}
            className="rounded-full bg-violet-600 text-white hover:bg-violet-700"
          >
            <User className="h-4 w-4" />
            Entrar
          </Button>
        )}
      </div>
    </>
  );

  return (
    <AppShell
      activeNav={nav}
      onNavigate={handleNav}
      onBrandClick={handleNewProject}
      hideHeader={shellView === "studio" || showLovableHome}
      lovableHome={showLovableHome}
      workspaceName={workspaceLabel}
      avatarLabel={avatarLabel}
      onProfile={() => {
        if (!isLoggedIn) {
          setIsAuthOpen(true);
          return;
        }
        setIsProfileOpen(true);
      }}
      onUpgrade={() => handleNav("settings")}
      creditBalance={creditBalance}
      header={<>{headerActions}</>}
    >
      <AuthModal open={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <UserProfileModal
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <MyProjectsModal
        open={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        onOpened={() => setShellView("studio")}
      />
      <DeployPublishModal
        open={isDeployOpen}
        onClose={() => setIsDeployOpen(false)}
      />
      <UpgradeModal
        open={upgradeRequired}
        onClose={clearUpgradeRequired}
      />

      {shellView === "home" && nav === "connectors" ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F4F4F5]">
          <ConnectorsPanel />
        </div>
      ) : shellView === "home" && nav === "resources" ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F4F4F5]">
          <AgentsPanel />
        </div>
      ) : shellView === "home" && nav === "settings" ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F4F4F5]">
          <BillingSettings highlightUpgrade={upgradeRequired} />
          <div className="mx-auto max-w-3xl px-6 pb-10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsProfileOpen(true)}
              className="text-zinc-500"
            >
              Editar perfil
            </Button>
          </div>
        </div>
      ) : showLovableHome ? (
        <DashboardHome
          buildMode={buildMode}
          onBuildModeChange={setBuildMode}
          onSubmitPrompt={handleStartFromPrompt}
          isGenerating={isGenerating}
          onStop={stopGeneration}
          projects={projectsList}
          isLoadingProjects={isLoadingList}
          onOpenProject={(id) => void handleOpenProject(id)}
          isLoggedIn={isLoggedIn}
          onRequestLogin={() => setIsAuthOpen(true)}
          creditBalance={creditBalance}
          onOpenBilling={() => handleNav("settings")}
          userName={name || session?.user?.email || null}
          projectFilter={projectFilter}
          focusPromptToken={focusPromptToken}
        />
      ) : (
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-0 w-full flex-1 overflow-hidden"
        >
          <ResizablePanel
            id="chat"
            defaultSize="28"
            minSize="20"
            maxSize="40"
            className="min-w-0 overflow-hidden"
          >
            <div className="relative z-20 h-full min-w-0 overflow-hidden border-r border-white/10 bg-white/[0.02] backdrop-blur-md">
              <ChatPanel compact />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle className="z-30 bg-white/5" />
          <ResizablePanel
            id="workspace"
            defaultSize="72"
            minSize="55"
            className="min-w-0 overflow-hidden"
          >
            <WorkspacePanel
              projectName={currentProjectName}
              onBack={goHome}
              onSave={() => void handleSave()}
              isSaving={isSaving}
              onDeploy={() => setIsDeployOpen(true)}
              creditBalance={creditBalance}
              onOpenBilling={() => handleNav("settings")}
              isLoggedIn={isLoggedIn}
              avatarLabel={avatarLabel}
              onProfile={() => setIsProfileOpen(true)}
              onSignOut={() => void signOut()}
              onLogin={() => setIsAuthOpen(true)}
              saveMessage={saveMessage}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </AppShell>
  );
}

function WorkspacePanel({
  projectName,
  onBack,
  onSave,
  isSaving,
  onDeploy,
  creditBalance,
  onOpenBilling,
  isLoggedIn,
  avatarLabel,
  onProfile,
  onSignOut,
  onLogin,
  saveMessage,
}: {
  projectName: string | null;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  onDeploy: () => void;
  creditBalance: number | null;
  onOpenBilling: () => void;
  isLoggedIn: boolean;
  avatarLabel: string;
  onProfile: () => void;
  onSignOut: () => void;
  onLogin: () => void;
  saveMessage: string | null;
}) {
  const files = useStudioStore((state) => state.files);
  const activeFile = useStudioStore((state) => state.activeFile);
  const agentPhaseLabel = useStudioStore((state) => state.agentPhaseLabel);
  const [previewViewport, setPreviewViewport] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
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
    <Tabs
      defaultValue="preview"
      className="flex h-full min-h-0 flex-col bg-transparent"
    >
      {/* Única barra superior do Preview — sem chrome extra */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#27272A] bg-[#111113]/90 px-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 gap-1.5 px-2 text-xs text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <span className="hidden h-4 w-px bg-white/10 sm:block" />
          <p className="hidden max-w-[140px] truncate text-xs font-medium text-zinc-300 md:inline">
            {projectName || "Workspace"}
          </p>
          <TabsList className="ml-1 h-8 gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-0.5">
            <TabsTrigger
              value="preview"
              className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-violet-600/25 data-[state=active]:text-violet-100"
            >
              <MonitorPlay className="mr-1.5 h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
            <TabsTrigger
              value="code"
              className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-violet-600/25 data-[state=active]:text-violet-100"
            >
              <Code2 className="mr-1.5 h-3.5 w-3.5" />
              Code
            </TabsTrigger>
            <TabsTrigger
              value="console"
              className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-violet-600/25 data-[state=active]:text-violet-100"
            >
              <Terminal className="mr-1.5 h-3.5 w-3.5" />
              Console
            </TabsTrigger>
          </TabsList>
          <div className="ml-1 hidden items-center gap-0.5 rounded-full border border-white/10 bg-black/20 p-0.5 lg:flex">
            {(
              [
                ["desktop", Monitor, "Desktop"],
                ["tablet", Tablet, "Tablet"],
                ["mobile", Smartphone, "Mobile"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPreviewViewport(id)}
                title={label}
                className={cn(
                  "grid h-7 w-8 place-items-center rounded-full transition",
                  previewViewport === id
                    ? "bg-violet-600/25 text-violet-200"
                    : "text-slate-500 hover:text-white",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          {agentPhaseLabel ? (
            <span className="mr-1 hidden max-w-[160px] truncate text-[11px] text-violet-200/80 lg:inline">
              {agentPhaseLabel}
            </span>
          ) : null}
          {saveMessage ? (
            <span className="mr-1 hidden text-[11px] text-emerald-300 xl:inline">
              {saveMessage}
            </span>
          ) : null}
          {isLoggedIn && creditBalance !== null ? (
            <button
              type="button"
              onClick={onOpenBilling}
              className="hidden rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-100 md:inline"
            >
              {creditBalance}
            </button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onClick={onSave}
            className="h-8 px-2 text-xs text-zinc-400 hover:text-white"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeploy}
            className="h-8 px-2 text-xs text-zinc-400 hover:text-white"
            title="Deploy"
          >
            <Rocket className="h-3.5 w-3.5" />
          </Button>
          {isLoggedIn ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={onProfile}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-violet-500/25 text-[11px] text-violet-100">
                    {avatarLabel}
                  </AvatarFallback>
                </Avatar>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onSignOut}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={onLogin}
              className="h-8 rounded-full bg-violet-600 px-3 text-xs text-white hover:bg-violet-700"
            >
              Entrar
            </Button>
          )}
        </div>
      </div>

      <div className="relative min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-zinc-950/40">
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
              className="absolute inset-0 m-0 mt-0 flex h-full max-w-full min-h-0 min-w-0 items-stretch justify-center overflow-hidden bg-[#0A0A0B] p-0 data-[state=inactive]:hidden lg:p-3"
            >
              <div
                className={cn(
                  "h-full min-w-0 overflow-hidden bg-white transition-[width,border-radius] duration-300",
                  previewViewport !== "desktop" &&
                    "rounded-xl border border-white/10",
                )}
                style={{
                  width:
                    previewViewport === "mobile"
                      ? 390
                      : previewViewport === "tablet"
                        ? 768
                        : "100%",
                  maxWidth: "100%",
                }}
              >
                <PreviewRender />
              </div>
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
