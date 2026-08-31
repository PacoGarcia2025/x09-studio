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
      subtitle="Entre no ambiente premium do Studio e acompanhe agentes de IA construindo software em tempo real."
      footer={
        <>
          Já tem conta?{" "}
          <Link
            href={authLink("/login", safeNext)}
            className="text-violet-200 underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </>
      }
    >
      <LoginForm mode="signup" nextPath={safeNext} />
    </AuthShell>
  );
}
