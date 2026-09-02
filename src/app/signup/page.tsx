import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { authLink, sanitizeNextPath } from "@/lib/auth/paths";

type SignupPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next;
  const safeNext = sanitizeNextPath(nextParam);

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Cada conta nova recebe créditos para um site e um objeto 3D comercial. Depois, compre pacotes quando precisar."
      footer={
        <>
          Já tem conta?{" "}
          <Link
            href={authLink("/login", safeNext)}
            className="text-violet-200 underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
          <span className="mt-3 block text-[11px] text-zinc-600">
            <Link href="/legal/termos" className="hover:text-zinc-400">
              Termos
            </Link>
            {" · "}
            <Link href="/legal/privacidade" className="hover:text-zinc-400">
              Privacidade
            </Link>
          </span>
        </>
      }
    >
      <LoginForm mode="signup" nextPath={safeNext} />
    </AuthShell>
  );
}
