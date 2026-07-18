import {
  FolderKanban,
  LayoutDashboard,
  Plug,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AppNavId = "dashboard" | "projects" | "connectors" | "settings";

const NAV: Array<{
  id: AppNavId;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Meus Projetos", icon: FolderKanban },
  { id: "connectors", label: "Conectores", icon: Plug },
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
    <aside className="relative z-30 flex h-full w-[72px] shrink-0 flex-col items-center border-r border-white/10 bg-white/[0.03] py-4 backdrop-blur-md lg:w-[220px] lg:items-stretch lg:px-3">
      <button
        type="button"
        onClick={brandClick}
        className="mb-8 flex items-center gap-3 px-2 lg:px-3"
      >
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-500 text-sm font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]">
          X09
        </div>
        <div className="hidden min-w-0 text-left lg:block">
          <p className="truncate text-sm font-semibold tracking-tight text-white">
            studio.x09
          </p>
          <p className="truncate text-[11px] text-zinc-400">AI visual builder</p>
        </div>
      </button>

      <nav className="flex flex-1 flex-col gap-1">
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
                "group flex items-center justify-center gap-3 rounded-2xl px-0 py-3 text-sm transition lg:justify-start lg:px-3",
                isActive
                  ? "bg-indigo-500/20 text-indigo-100 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.35)]"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive
                    ? "text-indigo-300"
                    : "text-zinc-400 group-hover:text-white",
                )}
              />
              <span className="hidden font-medium lg:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md lg:block">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-indigo-200">
          <Sparkles className="h-3.5 w-3.5" />
          Agent mode
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-400">
          Planeja, constrói e corrige sozinho — qualidade nível Lovable.
        </p>
      </div>
    </aside>
  );
}
