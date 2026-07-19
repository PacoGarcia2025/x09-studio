import {
  Boxes,
  ChevronDown,
  Gift,
  LayoutGrid,
  MessageSquare,
  PanelLeftClose,
  Puzzle,
  Search,
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
  icon: typeof LayoutGrid;
  hint?: string;
}> = [
  { id: "dashboard", label: "Painel", icon: LayoutGrid },
  { id: "search", label: "Procurar", icon: Search, hint: "Ctrl K" },
  { id: "resources", label: "Recursos", icon: Sparkles },
  { id: "connectors", label: "Conectores", icon: Puzzle },
];

const PROJECT_NAV: Array<{
  id: AppNavId;
  label: string;
  icon: typeof Boxes;
}> = [
  { id: "projects", label: "Todos os projetos", icon: Boxes },
  { id: "starred", label: "Estrelado", icon: Star },
  { id: "mine", label: "Criado por mim", icon: UserRound },
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
    <aside className="relative z-30 flex h-full w-[72px] shrink-0 flex-col bg-[#F7F7F8] text-zinc-800 lg:w-[260px]">
      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-3 pb-1 pt-3.5 lg:px-4">
        <button
          type="button"
          onClick={brandClick}
          className="flex items-center"
          title="Studio X09"
        >
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-500 text-[10px] font-bold tracking-tight text-white shadow-[0_6px_16px_rgba(124,58,237,0.35)]">
            X09
          </span>
        </button>
        <button
          type="button"
          className="hidden h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-200/80 hover:text-zinc-600 lg:grid"
          title="Recolher menu"
          tabIndex={-1}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Workspace switcher */}
      <button
        type="button"
        onClick={onProfile}
        className="mx-3 mb-3 hidden items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-zinc-200/70 lg:flex"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-[10px] font-semibold text-white">
          {avatarLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-800">
          {workspaceName}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      </button>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2.5 lg:px-3">
        <div className="space-y-0.5">
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
                  "flex w-full items-center justify-center gap-2.5 rounded-xl px-0 py-2 text-[13px] font-medium transition lg:justify-start lg:px-2.5",
                  isActive
                    ? "bg-zinc-200/90 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0 text-zinc-600" />
                <span className="hidden flex-1 text-left lg:inline">
                  {item.label}
                </span>
                {item.hint ? (
                  <kbd className="hidden rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 lg:inline">
                    {item.hint}
                  </kbd>
                ) : null}
              </button>
            );
          })}
        </div>

        <div>
          <p className="mb-1 hidden px-2.5 text-[11px] font-medium text-zinc-400 lg:block">
            Projetos
          </p>
          <div className="space-y-0.5">
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
                    "flex w-full items-center justify-center gap-2.5 rounded-xl px-0 py-2 text-[13px] font-medium transition lg:justify-start lg:px-2.5",
                    isActive
                      ? "bg-zinc-200/90 text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 text-zinc-600" />
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="mt-auto space-y-2 p-2.5 lg:p-3">
        <div className="hidden rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-zinc-200/80 lg:block">
          <div className="mb-0.5 flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
            <Gift className="h-4 w-4 text-violet-600" />
            Indique o Studio
          </div>
          <p className="text-[11px] leading-4 text-zinc-500">
            Créditos por indicação paga
          </p>
        </div>

        <button
          type="button"
          onClick={onUpgrade}
          className="hidden w-full rounded-2xl bg-white p-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-zinc-200/80 transition hover:ring-violet-300 lg:block"
        >
          <div className="mb-0.5 flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
            <Zap className="h-4 w-4 text-violet-600" />
            Faça o upgrade
          </div>
          <p className="text-[11px] leading-4 text-zinc-500">
            {creditBalance != null
              ? `${creditBalance} créditos · mais recursos`
              : "Desbloqueie mais recursos"}
          </p>
        </button>

        <div className="flex items-center justify-between px-0.5 pt-1">
          <button
            type="button"
            onClick={onProfile}
            className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xs font-semibold text-white"
            title="Conta"
          >
            {avatarLabel}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("settings")}
            className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-200/70 hover:text-zinc-800"
            title="Inbox / configurações"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
