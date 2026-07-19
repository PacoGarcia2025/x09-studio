import {
  ArrowLeft,
  Code2,
  Eye,
  ExternalLink,
  Layers,
  Loader2,
  LogOut,
  Monitor,
  RefreshCw,
  Rocket,
  Save,
  Share2,
  Smartphone,
  Tablet,
  Terminal,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SandpackProvider } from "@codesandbox/sandpack-react";
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
import { SandpackErrorBridge } from "@/components/workspace/SandpackErrorBridge";
import { toSandpackFiles } from "@/components/workspace/sandpack-files";
import { sandpackCustomSetup } from "@/components/workspace/sandpack-setup";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/store/studio-store";

type LovableStudioProps = {
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
};

/**
 * Editor estilo Lovable: top bar única + chat lateral + preview full-bleed até o rodapé.
 */
export function LovableStudio({
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
}: LovableStudioProps) {
  const files = useStudioStore((state) => state.files);
  const activeFile = useStudioStore((state) => state.activeFile);
  const agentPhaseLabel = useStudioStore((state) => state.agentPhaseLabel);
  const [previewViewport, setPreviewViewport] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const [previewKey, setPreviewKey] = useState(0);

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

  const statusLabel = agentPhaseLabel
    ? agentPhaseLabel
    : saveMessage === "Projeto salvo!"
      ? "Visualizando a última versão salva"
      : "Pronto para editar";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F7F8]">
      <Tabs
        defaultValue="preview"
        className="flex h-full min-h-0 flex-1 flex-col"
      >
        {/* Top bar — uma linha, itens Lovable */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-3">
          <button
            type="button"
            onClick={onBack}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            title="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-500 text-[9px] font-bold text-white">
            X09
          </span>

          <div className="min-w-0 shrink">
            <p className="truncate text-sm font-semibold text-zinc-900">
              {projectName || "Novo projeto"}
            </p>
            <p className="truncate text-[11px] text-zinc-500">{statusLabel}</p>
          </div>

          <TabsList className="mx-auto hidden h-9 gap-0.5 rounded-full bg-zinc-100 p-1 sm:flex">
            <TabsTrigger
              value="preview"
              className="h-7 gap-1.5 rounded-full px-3 text-xs data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm"
            >
              <Eye className="h-3.5 w-3.5" />
              Pré-visualização
            </TabsTrigger>
            <TabsTrigger
              value="code"
              className="h-7 gap-1.5 rounded-full px-3 text-xs data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm"
            >
              <Code2 className="h-3.5 w-3.5" />
              Código
            </TabsTrigger>
            <TabsTrigger
              value="console"
              className="h-7 gap-1.5 rounded-full px-3 text-xs data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm"
            >
              <Terminal className="h-3.5 w-3.5" />
              Console
            </TabsTrigger>
            <TabsTrigger
              value="layers"
              className="h-7 gap-1.5 rounded-full px-3 text-xs data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm"
            >
              <Layers className="h-3.5 w-3.5" />
              Camadas
            </TabsTrigger>
          </TabsList>

          <div className="ml-auto flex items-center gap-1">
            <div className="mr-1 hidden items-center gap-0.5 rounded-full bg-zinc-100 p-0.5 lg:flex">
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
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPreviewKey((k) => k + 1)}
              className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100"
              title="Atualizar preview"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            <span className="mx-1 hidden items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-600 md:inline-flex">
              Página inicial
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </span>

            {isLoggedIn ? (
              <button
                type="button"
                onClick={onProfile}
                className="ml-1"
                title="Perfil"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-violet-100 text-[11px] text-violet-700">
                    {avatarLabel}
                  </AvatarFallback>
                </Avatar>
              </button>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              className="hidden h-8 gap-1.5 rounded-full px-3 text-xs text-zinc-600 hover:bg-zinc-100 sm:inline-flex"
            >
              <Share2 className="h-3.5 w-3.5" />
              Compartilhar
            </Button>

            <Button
              size="sm"
              disabled={isSaving}
              onClick={onSave}
              className="h-8 gap-1.5 rounded-full bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-700"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Atualizar
            </Button>

            <Button
              size="sm"
              onClick={onDeploy}
              className="h-8 gap-1.5 rounded-full bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <Rocket className="h-3.5 w-3.5" />
              Publicar
            </Button>

            {isLoggedIn && creditBalance != null ? (
              <button
                type="button"
                onClick={onOpenBilling}
                className="hidden rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 xl:inline"
              >
                {creditBalance}
              </button>
            ) : null}

            {isLoggedIn ? (
              <button
                type="button"
                onClick={onSignOut}
                className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            ) : (
              <Button
                size="sm"
                onClick={onLogin}
                className="h-8 rounded-full bg-zinc-900 px-3 text-xs text-white"
              >
                Entrar
              </Button>
            )}

            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 lg:hidden"
              title="Salvar"
            >
              <Save className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Corpo: chat | preview até o rodapé da tela */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-0 w-full flex-1"
          >
            <ResizablePanel
              id="chat"
              defaultSize="32"
              minSize="22"
              maxSize="42"
              className="min-w-0 overflow-hidden border-r border-zinc-200 bg-white"
            >
              <ChatPanel compact variant="lovable" />
            </ResizablePanel>

            <ResizableHandle className="w-px bg-zinc-200 transition hover:bg-violet-300" />

            <ResizablePanel
              id="preview"
              defaultSize="68"
              minSize="50"
              className="relative min-w-0 overflow-hidden bg-zinc-100"
            >
              <SandpackProvider
                key={previewKey}
                template="react-ts"
                theme="light"
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
                <div className="absolute inset-0 overflow-hidden">
                  <TabsContent
                    value="preview"
                    forceMount
                    className="absolute inset-0 m-0 flex h-full w-full items-stretch justify-center overflow-hidden p-0 data-[state=inactive]:hidden"
                  >
                    <div
                      className={cn(
                        "h-full min-w-0 overflow-hidden bg-white",
                        previewViewport !== "desktop" &&
                          "my-0 rounded-none border-x border-zinc-200 shadow-none",
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
                    className="absolute inset-0 m-0 h-full overflow-hidden data-[state=inactive]:hidden"
                  >
                    <CodeEditor />
                  </TabsContent>

                  <TabsContent
                    value="console"
                    className="absolute inset-0 m-0 h-full overflow-hidden data-[state=inactive]:hidden"
                  >
                    <ConsoleRender />
                  </TabsContent>

                  <TabsContent
                    value="layers"
                    className="absolute inset-0 m-0 flex h-full items-center justify-center bg-white data-[state=inactive]:hidden"
                  >
                    <p className="text-sm text-zinc-500">
                      Camadas / Visual Edits em breve
                    </p>
                  </TabsContent>
                </div>
              </SandpackProvider>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </Tabs>
    </div>
  );
}
