import { LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { AgentsPanel } from "@/components/agents/AgentsPanel";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { ConnectorsPanel } from "@/components/connectors/ConnectorsPanel";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { AppShell } from "@/components/layout/AppShell";
import type { AppNavId } from "@/components/layout/SidebarNav";
import { UserProfileModal } from "@/components/profile/UserProfileModal";
import { DeployPublishModal } from "@/components/projects/DeployPublishModal";
import { MyProjectsModal } from "@/components/projects/MyProjectsModal";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { LovableStudio } from "@/components/workspace/LovableStudio";
import { fetchBillingMe } from "@/lib/api-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
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
  }, [clearUser, fetchProfile, setSession]);

  useEffect(() => {
    if (!isLoggedIn) {
      setCreditBalance(null);
      return;
    }
    void fetchBillingMe()
      .then((snap) => setCreditBalance(snap.wallet.balance))
      .catch(() => setCreditBalance(null));
  }, [isLoggedIn, upgradeRequired]);

  useEffect(() => {
    if (isLoggedIn) void fetchUserProjects();
  }, [fetchUserProjects, isLoggedIn]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setNav("search");
        setShellView("home");
        setFocusPromptToken((v) => v + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function goHome() {
    setShellView("home");
    setNav("dashboard");
  }

  function handleNewProject() {
    createNewProject();
    setShellView("home");
    setNav("dashboard");
    setFocusPromptToken((v) => v + 1);
  }

  async function handleStartFromPrompt(prompt: string) {
    if (!isLoggedIn) {
      setIsAuthOpen(true);
      return;
    }
    createNewProject();
    setShellView("studio");
    await sendMessage(prompt);
  }

  async function handleSave() {
    const result = await saveProject();
    setSaveMessage(result.error ? result.error : "Projeto salvo!");
    window.setTimeout(() => setSaveMessage(null), 2800);
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
    ? `Studio do ${name.trim().split(/\s+/)[0]}`
    : "Studio X09";

  const headerActions = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-900">
          {nav === "resources"
            ? "Recursos"
            : nav === "connectors"
              ? "Conectores"
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
    <>
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
      <UpgradeModal open={upgradeRequired} onClose={clearUpgradeRequired} />

      {shellView === "studio" ? (
        <LovableStudio
          projectName={currentProjectName}
          onBack={goHome}
          onSave={() => void handleSave()}
          isSaving={isSaving}
          onDeploy={() => setIsDeployOpen(true)}
          creditBalance={creditBalance}
          onOpenBilling={() => {
            setShellView("home");
            handleNav("settings");
          }}
          isLoggedIn={isLoggedIn}
          avatarLabel={avatarLabel}
          onProfile={() => setIsProfileOpen(true)}
          onSignOut={() => void signOut()}
          onLogin={() => setIsAuthOpen(true)}
          saveMessage={saveMessage}
        />
      ) : (
        <AppShell
          activeNav={nav}
          onNavigate={handleNav}
          onBrandClick={handleNewProject}
          hideHeader={showLovableHome}
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
          {nav === "connectors" ? (
            <div className="min-h-0 flex-1 overflow-y-auto bg-[#F4F4F5]">
              <ConnectorsPanel />
            </div>
          ) : nav === "resources" ? (
            <div className="min-h-0 flex-1 overflow-y-auto bg-[#F4F4F5]">
              <AgentsPanel />
            </div>
          ) : nav === "settings" ? (
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
          ) : (
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
          )}
        </AppShell>
      )}
    </>
  );
}
