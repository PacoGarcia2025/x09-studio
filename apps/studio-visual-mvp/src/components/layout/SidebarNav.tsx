import {
  Bot,
  Boxes,
  FolderKanban,
  Home,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AppNavId =
  | "dashboard"
  | "create"
  | "projects"
  | "agents"
  | "ecosystem"
  | "settings";

const NAV: Array<{
  id: AppNavId;
  label: string;
  icon: typeof Home;
  featured?: boolean;
}> = [
  { id: "dashboard", label: "Início", icon: Home },
  { id: "create", label: "Criar App", icon: Plus, featured: true },
  { id: "projects", label: "Meus Apps", icon: FolderKanban },
  { id: "agents", label: "Agentes", icon: Bot },
  { id: "ecosystem", label: "Ecossistema", icon: Boxes },
  { id: "settings", label: "Configurações", icon: Settings },
];

export function SidebarNav({
  active,
  onNavigate,
  brandClick,
}: {
  active: AppNavId;
  onNavigate: (id: AppNavId) => void;
  brandClick: () => void;
}) {
  return (
    <aside className="relative z-30 flex h-full w-[72px] shrink-0 flex-col items-center border-r border-[#27272A] bg-[#111113]/95 py-4 backdrop-blur-xl lg:w-[232px] lg:items-stretch lg:px-3">
      <button
        type="button"
        onClick={brandClick}
        className="mb-7 flex items-center gap-3 px-2 py-1 lg:px-3"
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-600 text-sm font-bold text-white shadow-[0_0_24px_rgba(124,58,237,0.32)]">
          X09
        </div>
        <div className="hidden min-w-0 text-left lg:block">
          <p className="truncate text-sm font-semibold tracking-tight text-[#F8FAFC]">
            Studio X09
          </p>
          <p className="truncate text-[11px] text-slate-400">AI app builder</p>
        </div>
      </button>

      <p className="mb-2 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 lg:block">
        Workspace
      </p>
      <nav className="flex flex-1 flex-col gap-1.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={item.label}
              className={cn(
                "group flex items-center justify-center gap-3 rounded-xl px-0 py-2.5 text-sm font-medium transition duration-200 lg:justify-start lg:px-3",
                item.featured
                  ? "my-1 bg-violet-600 text-white shadow-[0_8px_24px_rgba(124,58,237,0.24)] hover:bg-violet-700"
                  : isActive
                    ? "bg-violet-600/15 text-violet-100 ring-1 ring-inset ring-violet-500/25"
                    : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  item.featured
                    ? "text-white"
                    : isActive
                      ? "text-violet-300"
                      : "text-slate-500 group-hover:text-white",
                )}
              />
              <span className="hidden font-medium lg:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto hidden rounded-xl border border-violet-500/15 bg-violet-500/[0.06] p-3 lg:block">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-violet-200">
          <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
          X09 Agent
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Planeja, constrói, verifica e corrige seu app.
        </p>
      </div>
    </aside>
  );
}
