import type { ReactNode } from "react";
import { SidebarNav, type AppNavId } from "@/components/layout/SidebarNav";
import { cn } from "@/lib/utils";

/** Shell principal do produto: sidebar fixa + superfície violeta premium. */
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
        "bg-[#0A0A0B]",
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
          <div className="absolute -left-24 -top-20 h-80 w-80 rounded-full bg-violet-600/15 blur-[120px]" />
          <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 h-56 w-[30rem] rounded-full bg-indigo-600/10 blur-[110px]" />
        </div>

        {!hideHeader && header ? (
          <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#27272A] bg-[#111113]/75 px-5 backdrop-blur-xl">
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
