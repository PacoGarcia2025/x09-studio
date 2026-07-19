import type { ReactNode } from "react";
import { SidebarNav, type AppNavId } from "@/components/layout/SidebarNav";
import { cn } from "@/lib/utils";

/** Shell estilo Lovable: sidebar clara + área principal com superfície limpa. */
export function AppShell({
  activeNav,
  onNavigate,
  onBrandClick,
  header,
  children,
  hideHeader = false,
  className,
  workspaceName,
  avatarLabel,
  onProfile,
  onUpgrade,
  creditBalance,
  lovableHome = false,
}: {
  activeNav: AppNavId;
  onNavigate: (id: AppNavId) => void;
  onBrandClick: () => void;
  header?: ReactNode;
  children: ReactNode;
  hideHeader?: boolean;
  className?: string;
  workspaceName?: string;
  avatarLabel?: string;
  onProfile?: () => void;
  onUpgrade?: () => void;
  creditBalance?: number | null;
  /** Home dashboard com fundo gradiente (estilo Lovable). */
  lovableHome?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-screen overflow-hidden",
        lovableHome ? "bg-[#F4F4F5]" : "bg-[#F4F4F5]",
        className,
      )}
    >
      <SidebarNav
        active={activeNav}
        onNavigate={onNavigate}
        brandClick={onBrandClick}
        workspaceName={workspaceName}
        avatarLabel={avatarLabel}
        onProfile={onProfile}
        onUpgrade={onUpgrade}
        creditBalance={creditBalance}
      />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {!hideHeader && header ? (
          <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/80 px-5 backdrop-blur-xl">
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
