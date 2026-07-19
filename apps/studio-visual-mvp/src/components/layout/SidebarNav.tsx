import {
  Boxes,
  ChevronDown,
  FolderKanban,
  Gift,
  LayoutDashboard,
  PanelLeft,
  Search,
  Settings,
  Sparkles,
  Star,
  UserRound,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AppNavId =
  | "dashboard"
  | "search"
  | "resources"
  | "connectors"
  | "projects"
  | "starred"
  | "mine"
  | "settings";

type SidebarNavProps = {
  active: AppNavId;
  onNavigate: (id: AppNavId) => void;
  brandClick: () => void;
  workspaceName?: string;
  avatarLabel?: string;
  onProfile?: () => void;
  onUpgrade?: () => void;
  creditBalance?: number | null;
};

const PRIMARY_NAV: Array<{
  id: AppNavId;
  label: string;
  icon: typeof LayoutDashboard;
  hint?: string;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "search", label: "Search", icon: Search, hint: "Ctrl K" },
  { id: "resources", label: "Resources", icon: Sparkles },
  { id: "connectors", label: "Connectors", icon: Boxes },
];

const PROJECT_NAV: Array<{
  id: AppNavId;
  label: string;
  icon: typeof FolderKanban;
}> = [
  { id: "projects", label: "All projects", icon: FolderKanban },
  { id: "starred", label: "Starred", icon: Star },
  { id: "mine", label: "Created by me", icon: UserRound },
];

export function SidebarNav({
  active,
  onNavigate,
  brandClick,
  workspaceName = "Studio X09",
  avatarLabel = "X",
  onProfile,
  onUpgrade,
  creditBalance,
}: SidebarNavProps) {
  return (
    <aside className="relative z-30 flex h-full w-[72px] shrink-0 flex-col border-r border-zinc-200/80 bg-[#F4F4F5] text-zinc-800 lg:w-[248px]">
      <div className="flex items-center justify-between px-3 pb-2 pt-4 lg:px-4">
        <button
          type="button"
          onClick={brandClick}
          className="flex items-center gap-2.5"
          title="Studio X09"
        >
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-600 text-xs font-bold text-white shadow-[0_8px_20px_rgba(124,58,237,0.28)]">
            X09
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-zinc-900 lg:inline">
            Studio
          </span>
        </button>
        <button
          type="button"
          className="hidden h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-700 lg:grid"
          title="Recolher"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onProfile}
        className="mx-2 mb-4 hidden items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-left shadow-sm transition hover:border-violet-300 lg:flex"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-[11px] font-semibold text-white">
          {avatarLabel}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-zinc-900">
            {workspaceName}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
      </button>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 lg:px-3">
        <div className="space-y-1">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                title={item.label}
                className={cn(
                  "flex w-full items-center justify-center gap-3 rounded-xl px-0 py-2.5 text-sm font-medium transition lg:justify-start lg:px-3",
                  isActive
                    ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                    : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900",
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    isActive ? "text-violet-600" : "text-zinc-500",
                  )}
                />
                <span className="hidden flex-1 text-left lg:inline">
                  {item.label}
                </span>
                {item.hint ? (
                  <span className="hidden rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 lg:inline">
                    {item.hint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div>
          <p className="mb-1.5 hidden px-3 text-[11px] font-semibold text-zinc-500 lg:block">
            Projects
          </p>
          <div className="space-y-1">
            {PROJECT_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  className={cn(
                    "flex w-full items-center justify-center gap-3 rounded-xl px-0 py-2.5 text-sm font-medium transition lg:justify-start lg:px-3",
                    isActive
                      ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                      : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      isActive ? "text-violet-600" : "text-zinc-500",
                    )}
                  />
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="mt-auto space-y-2 p-2 lg:p-3">
        <div className="hidden rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm lg:block">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <Gift className="h-4 w-4 text-violet-600" />
            Indique o Studio
          </div>
          <p className="text-xs leading-5 text-zinc-500">
            Ganhe créditos quando um amigo assinar um pacote.
          </p>
        </div>

        <button
          type="button"
          onClick={onUpgrade}
          className="hidden w-full rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-3 text-left shadow-sm transition hover:border-violet-300 lg:block"
        >
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <Zap className="h-4 w-4 text-violet-600" />
            Upgrade
          </div>
          <p className="text-xs leading-5 text-zinc-500">
            {creditBalance != null
              ? `${creditBalance} créditos · desbloquear mais`
              : "Desbloqueie mais créditos e recursos"}
          </p>
        </button>

        <div className="flex items-center justify-between gap-2 rounded-xl px-1 py-1">
          <button
            type="button"
            onClick={onProfile}
            className="flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 transition hover:bg-zinc-200/60"
            title="Perfil"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xs font-semibold text-white">
              {avatarLabel}
            </span>
            <span className="hidden min-w-0 lg:block">
              <span className="block truncate text-xs font-medium text-zinc-800">
                Conta
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("settings")}
            className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-200/70 hover:text-zinc-800"
            title="Configurações"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
