import Link from "next/link";
import { StudioAtmosphere } from "@/components/brand/StudioAtmosphere";
import { signOut } from "@/lib/projects/actions";

const PRIMARY = [
  { href: "/projects", label: "Painel", icon: "▦" },
  { href: "/projects#prompt", label: "Procurar", icon: "⌕", hint: "Ctrl K" },
  { href: "/assets", label: "Assets", icon: "◇" },
  { href: "/ai", label: "Recursos", icon: "✦" },
  { href: "/ecosystem", label: "Conectores", icon: "⧉" },
] as const;

const PROJECTS = [
  { href: "/projects", label: "Todos os projetos", icon: "▤" },
  { href: "/projects", label: "Estrelado", icon: "★" },
  { href: "/projects", label: "Criado por mim", icon: "☺" },
] as const;

export function AppShell({
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
  return (
    <div className="x09-landing relative flex min-h-screen overflow-hidden text-zinc-100">
      <StudioAtmosphere />

      <aside className="relative z-10 sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-white/8 bg-black/25 backdrop-blur-xl lg:flex">
        <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
          <Link href="/projects" className="flex items-center gap-2.5" title="Studio X09">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-500/20 text-[10px] font-bold tracking-tight text-violet-100 ring-1 ring-violet-400/30">
              X09
            </span>
            <span className="text-sm font-semibold text-white">Studio</span>
          </Link>
        </div>

        <div className="mx-3 mb-3 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-sky-400 text-[10px] font-semibold text-white">
            {avatarLabel}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-200">
            {workspaceName}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3">
          <div className="space-y-0.5">
            {PRIMARY.map((item) => {
              const active =
                item.href === activeHref ||
                (item.href === "/projects" &&
                  activeHref.startsWith("/projects")) ||
                (item.href === "/assets" && activeHref.startsWith("/assets"));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition ${
                    active && item.href !== "/projects#prompt"
                      ? "bg-violet-500/15 text-white ring-1 ring-violet-400/20"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                  }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {"hint" in item && item.hint ? (
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
            <div className="mb-0.5 flex items-center gap-2 text-[13px] font-semibold text-white">
              Indique o Studio
            </div>
            <p className="text-[11px] leading-4 text-zinc-500">
              Créditos por indicação paga
            </p>
          </div>

          <Link
            href="/billing"
            className="x09-card-soft block w-full rounded-2xl p-3 text-left transition hover:border-violet-400/30"
          >
            <div className="mb-0.5 flex items-center gap-2 text-[13px] font-semibold text-white">
              Faça o upgrade
            </div>
            <p className="text-[11px] leading-4 text-zinc-500">
              Desbloqueie mais recursos
            </p>
          </Link>

          <div className="flex items-center justify-between px-0.5 pt-1">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-sky-400 text-xs font-semibold text-white">
              {avatarLabel}
            </span>
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
        <header className="sticky top-0 z-30 border-b border-white/8 bg-black/40 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/projects" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500/20 text-[10px] font-bold text-violet-100 ring-1 ring-violet-400/30">
                X09
              </span>
              <span className="text-sm font-semibold text-white">Studio</span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="x09-button-secondary px-3 py-1.5 text-xs"
              >
                Sair
              </button>
            </form>
          </div>
        </header>

        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
