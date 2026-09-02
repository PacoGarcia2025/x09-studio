"use client";

import { sanitizeNextPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Provider } from "@supabase/supabase-js";

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
  const [oauthPending, setOauthPending] = useState<Provider | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);

    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload =
        mode === "signup"
          ? { email, password, fullName, next: safeNext }
          : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        needsEmailConfirmation?: boolean;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Falha na autenticação");
      }

      if (mode === "signup" && data.needsEmailConfirmation) {
        setInfo(
          "Enviamos um link de confirmação para seu e-mail. Após confirmar, você será redirecionado ao Studio.",
        );
        return;
      }

      router.replace(safeNext);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha na autenticação";
      if (/failed to fetch/i.test(message)) {
        setError(
          "Não foi possível conectar ao servidor. Verifique sua internet ou tente novamente.",
        );
      } else {
        setError(message);
      }
    } finally {
      setPending(false);
    }
  }

  async function onOauth(provider: "google" | "facebook") {
    setError(null);
    setInfo(null);
    setOauthPending(provider);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (oauthError) {
        throw oauthError;
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Falha no login social";
      if (/unsupported provider|not enabled|disabled/i.test(raw)) {
        setError(
          provider === "google"
            ? "Login com Google ainda não está ligado neste ambiente."
            : "Login com Facebook ainda não está ligado neste ambiente.",
        );
      } else {
        setError(raw);
      }
      setOauthPending(null);
    }
  }

  const busy = pending || oauthPending !== null;

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
        disabled={busy}
        className="x09-button w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending
          ? "Aguarde…"
          : mode === "signup"
            ? "Criar conta"
            : "Entrar"}
      </button>

      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          ou
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onOauth("google")}
          className="x09-button-secondary w-full rounded-2xl px-4 py-2.5 text-sm disabled:opacity-60"
        >
          {oauthPending === "google" ? "A redirecionar…" : "Continuar com Google"}
        </button>
        {process.env.NEXT_PUBLIC_AUTH_FACEBOOK === "1" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onOauth("facebook")}
            className="x09-button-secondary w-full rounded-2xl px-4 py-2.5 text-sm disabled:opacity-60"
          >
            {oauthPending === "facebook"
              ? "A redirecionar…"
              : "Continuar com Facebook"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
