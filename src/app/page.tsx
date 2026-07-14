import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/projects");

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          X09 Studio
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Gerador de software com IA
        </h1>
        <p className="text-zinc-400 leading-relaxed">
          Plataforma interna para criar sistemas, apps e web apps com pipeline
          Planner → Builder → Preview → Deploy.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-200 hover:border-zinc-600"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </main>
  );
}
