import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            X09 Studio
          </p>
          <h1 className="text-2xl font-semibold">Criar conta</h1>
          <p className="text-sm text-zinc-400">
            Beta interno — apenas a equipe X09.
          </p>
        </div>

        <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
          <LoginForm mode="signup" />
        </Suspense>

        <p className="text-sm text-zinc-500">
          Já tem conta?{" "}
          <Link href="/login" className="text-zinc-200 underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
