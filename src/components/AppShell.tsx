import Link from "next/link";
import { signOut } from "@/lib/projects/actions";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/projects" className="text-sm font-medium tracking-wide">
            X09 Studio
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
