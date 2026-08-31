"use client";

import { createClient } from "@/lib/supabase/client";
import { sanitizeNextPath } from "@/lib/auth/paths";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm({
  mode,
  nextPath = "/projects",
}: {
  mode: "login" | "signup";
  nextPath?: string;
}) {
  const router = useRouter();
  const safeNext = sanitizeNextPath(nextPath);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName || undefined },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
          },
        });
        if (signUpError) throw signUpError;

        if (!data.session) {
          setInfo(
            "Enviamos um link de confirmação para seu e-mail. Após confirmar, você será redirecionado ao Studio.",
          );
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      router.replace(safeNext);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      {mode === "signup" ? (
        <div className="space-y-1.5">
          <label htmlFor="full_name" className="text-sm text-zinc-400">
            Nome
          </label>
          <input
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="x09-input w-full rounded-2xl px-4 py-3 text-sm"
            placeholder="Seu nome"
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm text-zinc-400">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="x09-input w-full rounded-2xl px-4 py-3 text-sm"
          placeholder="voce@empresa.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm text-zinc-400">
          Senha
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="x09-input w-full rounded-2xl px-4 py-3 text-sm"
          placeholder="••••••••"
        />
      </div>

      {info ? (
        <p className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
          {info}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="x09-button w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending
          ? "Aguarde…"
          : mode === "signup"
            ? "Criar conta"
            : "Entrar"}
      </button>
    </form>
  );
}
