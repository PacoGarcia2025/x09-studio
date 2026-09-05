import Link from "next/link";
import { CreditBalanceChip } from "@/components/billing/CreditBalanceChip";
import { StudioAtmosphere } from "@/components/brand/StudioAtmosphere";
import {
  AppShellMobileNav,
  type ShellNavItem,
} from "@/components/layout/AppShellMobileNav";
import { isCurrentUserStudioOperator } from "@/lib/auth/studio-operator.server";
import { signOut } from "@/lib/projects/actions";
import { loadCurrentProfile } from "@/lib/profile/load";
import { createClient } from "@/lib/supabase/server";

const PRIMARY: ShellNavItem[] = [
  { href: "/projects", label: "Painel", icon: "▦" },
  { href: "/assets", label: "3D", icon: "◇" },
  { href: "/biblioteca", label: "Biblioteca", icon: "▣" },
  { href: "/perfil", label: "Meu perfil", icon: "◐" },
  { href: "/ai", label: "Recursos", icon: "✦" },
  { href: "/ecosystem", label: "Conectores", icon: "⧉" },
];

const PROJECTS: ShellNavItem[] = [
  { href: "/projects", label: "Todos os projetos", icon: "▤" },
];

const OPS_HREFS = new Set(["/ai", "/ecosystem"]);

export async function AppShell({
  children,
  workspaceName = "Studio X09",
  avatarLabel = "X",
  activeHref = "/projects",
}: {
  children: React.ReactNode;
  workspaceName?: string;
  avatarLabel?: string;
  activeHref?: string;
  hideHeader?: boolean;
}) {
  const showOps = await isCurrentUserStudioOperator();
  const navItems = PRIMARY.filter(
    (item) => showOps || !OPS_HREFS.has(item.href),
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let creditBalance = 0;
  let avatarUrl: string | null = null;
  let shellName = workspaceName;
  let shellLabel = avatarLabel;
  if (user) {
    const { data: wallet } = await supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    creditBalance = wallet?.balance ?? 0;
    const loaded = await loadCurrentProfile();
    if (loaded.ok) {
      avatarUrl = loaded.data.avatarUrl;
      const first =
        loaded.data.profile.fullName.split(/\s+/)[0] ||
        loaded.data.email.split("@")[0];
      if (first) {
        shellLabel = first.charAt(0).toUpperCase();
        if (workspaceName === "Studio X09") {
          shellName = `Studio do ${first}`;
        }
      }
    }
  }

  const credits = <CreditBalanceChip balance={creditBalance} />;
  const creditsCompact = (
    <CreditBalanceChip balance={creditBalance} compact />
  );

  return (
    <div className="x09-landing relative flex min-h-dvh text-zinc-100 lg:h-dvh lg:overflow-hidden">
      <StudioAtmosphere />

      <aside className="relative z-10 sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-r border-white/8 bg-black/25 backdrop-blur-xl lg:flex">
        <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
          <Link href="/projects" className="flex items-center gap-2.5" title="Studio X09">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-500/20 text-[10px] font-bold tracking-tight text-violet-100 ring-1 ring-violet-400/30">
              X09
            </span>
            <span className="text-sm font-semibold text-white">Studio</span>
          </Link>
        </div>

        <Link
          href="/perfil"
          className="mx-3 mb-3 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2 transition hover:bg-white/[0.05]"
        >
          <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-sky-400 text-[10px] font-semibold text-white">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              shellLabel
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-200">
            {shellName}
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const active =
                item.href === activeHref ||
                (item.href === "/projects" &&
                  activeHref.startsWith("/projects")) ||
                (item.href === "/assets" && activeHref.startsWith("/assets")) ||
                (item.href === "/biblioteca" &&
                  activeHref.startsWith("/biblioteca")) ||
                (item.href === "/perfil" && activeHref.startsWith("/perfil"));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition ${
                    active
                      ? "bg-violet-500/15 text-white ring-1 ring-violet-400/20"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                  }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.hint ? (
                    <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                      {item.hint}
                    </kbd>
                  ) : null}
                </Link>
              );
            })}
          </div>

          <div>
            <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Projetos
            </p>
            <div className="space-y-0.5">
              {PROJECTS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-100"
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="mt-auto space-y-2 p-3">
          <div className="x09-card-soft rounded-2xl p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Saldo
            </p>
            {credits}
          </div>

          <div className="flex items-center justify-between px-0.5 pt-1">
            <Link
              href="/perfil"
              className="flex items-center gap-2 rounded-lg py-1 pr-2 text-zinc-400 transition hover:text-zinc-200"
              title="Meu perfil"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-white/15"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-sky-400 text-xs font-semibold text-white">
                  {shellLabel}
                </span>
              )}
              <span className="text-xs font-medium">Perfil</span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
                title="Sair"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-black/40 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:static lg:border-b">
          <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <AppShellMobileNav
                items={[...navItems, ...PROJECTS]}
                activeHref={activeHref}
                footer={
                  <>
                    <div className="x09-card-soft rounded-2xl p-3">{credits}</div>
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="x09-button-secondary w-full px-3 py-2 text-sm"
                      >
                        Sair
                      </button>
                    </form>
                  </>
                }
              />
              <Link href="/projects" className="flex min-w-0 items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-[10px] font-bold text-violet-100 ring-1 ring-violet-400/30">
                  X09
                </span>
                <span className="truncate text-sm font-semibold text-white">
                  Studio
                </span>
              </Link>
            </div>
            <div className="hidden min-w-0 lg:block" />
            <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
              {creditsCompact}
              <Link
                href="/perfil"
                className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-sky-400 text-[10px] font-semibold text-white ring-1 ring-white/15 lg:hidden"
                title="Meu perfil"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  shellLabel
                )}
              </Link>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
