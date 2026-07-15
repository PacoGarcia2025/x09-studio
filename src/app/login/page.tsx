import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { X09Robot } from "@/components/brand/X09Robot";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <main className="x09-bg relative grid min-h-screen place-items-center overflow-hidden p-6 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 x09-grid" />
      <div className="relative grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_380px]">
        <div className="hidden items-center justify-center lg:flex">
          <X09Robot compact />
        </div>
        <div className="x09-card rounded-[2rem] p-8">
          <div className="mb-8 space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
              X09 Studio
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Entrar</h1>
            <p className="text-sm leading-6 text-zinc-400">
              Acesse o laboratório de IA que constrói sistemas a partir de
              prompts, pipelines e verificações automáticas.
            </p>
          </div>

          <LoginForm mode="login" nextPath={nextParam || "/projects"} />

          <p className="mt-6 text-sm text-zinc-500">
            Ainda sem conta?{" "}
            <Link href="/signup" className="text-violet-200 underline-offset-4 hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
