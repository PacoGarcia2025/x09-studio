import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            X09 Studio
          </p>
          <h1 className="text-2xl font-semibold">Entrar</h1>
          <p className="text-sm text-zinc-400">
            Acesso interno da equipe. Conta exclusiva do Studio.
          </p>
        </div>

        <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
          <LoginForm mode="login" />
        </Suspense>

        <p className="text-sm text-zinc-500">
          Ainda sem conta?{" "}
          <Link href="/signup" className="text-zinc-200 underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
