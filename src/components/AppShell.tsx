import Link from "next/link";
import { signOut } from "@/lib/projects/actions";

  const PRIMARY = [
  { href: "/projects", label: "Painel", icon: "▦" },
  { href: "/projects#prompt", label: "Procurar", icon: "⌕", hint: "Ctrl K" },
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
  hideHeader = true,
}: {
  children: React.ReactNode;
  workspaceName?: string;
  avatarLabel?: string;
  activeHref?: string;
  hideHeader?: boolean;
}) {
  return (
    <div className="flex min-h-screen bg-[#F7F7F8] text-zinc-800">
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col bg-[#F7F7F8] lg:flex">
        <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
          <Link href="/projects" className="flex items-center" title="Studio X09">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-500 text-[10px] font-bold tracking-tight text-white shadow-[0_6px_16px_rgba(124,58,237,0.35)]">
              X09
            </span>
          </Link>
          <span className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400">
            ‹
          </span>
        </div>

        <div className="mx-3 mb-3 flex items-center gap-2 rounded-xl px-2 py-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-[10px] font-semibold text-white">
            {avatarLabel}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-800">
            {workspaceName}
          </span>
          <span className="text-zinc-400">▾</span>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3">
          <div className="space-y-0.5">
            {PRIMARY.map((item) => {
              const active =
                item.href === activeHref ||
                (item.href === "/projects" && activeHref.startsWith("/projects"));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition ${
                    active && item.href !== "/projects#prompt"
                      ? "bg-zinc-200/90 text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900"
                  }`}
                >
                  <span className="text-base leading-none text-zinc-600">
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {"hint" in item && item.hint ? (
                    <kbd className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                      {item.hint}
                    </kbd>
                  ) : null}
                </Link>
              );
            })}
          </div>

          <div>
            <p className="mb-1 px-2.5 text-[11px] font-medium text-zinc-400">
              Projetos
            </p>
            <div className="space-y-0.5">
              {PROJECTS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-200/50 hover:text-zinc-900"
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="mt-auto space-y-2 p-3">
          <div className="rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-zinc-200/80">
            <div className="mb-0.5 flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
              <span>🎁</span>
              Indique o Studio
            </div>
            <p className="text-[11px] leading-4 text-zinc-500">
              Créditos por indicação paga
            </p>
          </div>

          <Link
            href="/billing"
            className="block w-full rounded-2xl bg-white p-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-zinc-200/80 transition hover:ring-violet-300"
          >
            <div className="mb-0.5 flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
              <span>⚡</span>
              Faça o upgrade
            </div>
            <p className="text-[11px] leading-4 text-zinc-500">
              Desbloqueie mais recursos
            </p>
          </Link>

          <div className="flex items-center justify-between px-0.5 pt-1">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xs font-semibold text-white">
              {avatarLabel}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-200/70 hover:text-zinc-800"
                title="Sair"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!hideHeader ? (
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/projects" className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-[10px] font-bold text-white">
                  X09
                </span>
                <span className="text-sm font-semibold text-zinc-900">Studio</span>
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Sair
                </button>
              </form>
            </div>
          </header>
        ) : (
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/projects" className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-[10px] font-bold text-white">
                  X09
                </span>
                <span className="text-sm font-semibold text-zinc-900">Studio</span>
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Sair
                </button>
              </form>
            </div>
          </header>
        )}

        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
