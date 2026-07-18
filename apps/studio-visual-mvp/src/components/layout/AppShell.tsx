import type { ReactNode } from "react";
import { SidebarNav, type AppNavId } from "@/components/layout/SidebarNav";
import { cn } from "@/lib/utils";

/**
 * Shell Lovable: sidebar fixa + main glass com fundo vibrante.
 * Não altera o pipeline de agentes — só composição visual.
 */
export function AppShell({
  activeNav,
  onNavigate,
  onBrandClick,
  header,
  children,
  hideHeader = false,
  className,
}: {
  activeNav: AppNavId;
  onNavigate: (id: AppNavId) => void;
  onBrandClick: () => void;
  header?: ReactNode;
  children: ReactNode;
  hideHeader?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-screen overflow-hidden text-primary",
        "bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950",
        className,
      )}
    >
      <SidebarNav
        active={activeNav}
        onNavigate={onNavigate}
        brandClick={onBrandClick}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-indigo-500/15 blur-[110px]" />
          <div className="absolute right-0 top-32 h-64 w-64 rounded-full bg-violet-500/10 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 h-48 w-96 rounded-full bg-indigo-400/10 blur-[90px]" />
        </div>

        {!hideHeader && header ? (
          <header className="relative z-20 flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 backdrop-blur-md">
            {header}
          </header>
        ) : null}

        <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
