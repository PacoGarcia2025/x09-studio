import Link from "next/link";
import { signOut } from "@/lib/projects/actions";

export function AppShell({ children }: { children: React.ReactNode }) {
  const nav = [
    { href: "/projects", label: "Projetos", icon: "◆" },
    { href: "/projects/new", label: "Criar", icon: "+" },
    { href: "/ai", label: "IA Models", icon: "✦" },
    { href: "#", label: "Labs", icon: "◈" },
    { href: "#", label: "Docs", icon: "◇" },
  ];

  return (
    <div className="x09-bg min-h-screen text-zinc-100">
      <div className="pointer-events-none fixed inset-0 x09-grid" />
      <div className="relative flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-white/10 bg-black/20 p-5 backdrop-blur-xl lg:block">
          <Link href="/projects" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/20 text-violet-200 shadow-[0_0_34px_rgba(122,60,255,.35)]">
              X09
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-wide text-white">
                X09 Studio
              </span>
              <span className="block text-xs text-zinc-500">AI systems lab</span>
            </span>
          </Link>

          <nav className="mt-10 space-y-2">
            {nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/7 hover:text-white"
              >
                <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-violet-300 transition group-hover:border-violet-400/40 group-hover:bg-violet-500/15">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-violet-400/20 bg-violet-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-violet-300/80">
              Pipeline
            </p>
            <div className="mt-3 space-y-2 text-xs text-zinc-400">
              {["Planner", "Builder", "Verify", "Fix", "Preview", "Deploy"].map(
                (step) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_14px_rgba(168,85,247,.8)]" />
                    {step}
                  </div>
                ),
              )}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06030d]/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
              <Link href="/projects" className="flex items-center gap-3 lg:hidden">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-500/20 text-xs text-violet-200">
                  X09
                </span>
                <span className="text-sm font-medium">Studio</span>
              </Link>
              <div className="hidden items-center gap-2 text-xs text-zinc-500 lg:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,245,164,.7)]" />
                AI agents online
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="x09-muted-button rounded-2xl px-4 py-2 text-sm text-zinc-300"
                >
                  Sair
                </button>
              </form>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
