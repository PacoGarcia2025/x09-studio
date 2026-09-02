import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { authLink, sanitizeNextPath } from "@/lib/auth/paths";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next;
  const safeNext = sanitizeNextPath(nextParam);

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse o laboratório de IA que constrói sistemas a partir de prompts, pipelines e verificações automáticas."
      footer={
        <>
          Ainda sem conta?{" "}
          <Link
            href={authLink("/signup", safeNext)}
            className="text-violet-200 underline-offset-4 hover:underline"
          >
            Criar conta
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
      <LoginForm mode="login" nextPath={safeNext} />
    </AuthShell>
  );
}
