import { FormEvent, useState } from "react";
import { getSupabase } from "../lib/supabase";

type LoginPageProps = {
  onNavigateHome?: () => void;
  onNavigateApp?: () => void;
};

export function LoginPage({ onNavigateHome, onNavigateApp }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const supabase = getSupabase();
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        setOkMsg("Login realizado!");
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setOkMsg("Conta criada! Verifique seu e-mail se a confirmação estiver ativa.");
      }
      onNavigateApp?.() ?? onNavigateHome?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <button
          type="button"
          onClick={() => onNavigateHome?.()}
          className="mb-6 text-sm text-violet-600 hover:underline"
        >
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold text-zinc-900">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Acesse para continuar no seu app.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            <span className="text-zinc-700">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-violet-400"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-700">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-violet-400"
              required
              minLength={6}
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
          {okMsg ? (
            <p className="text-sm text-emerald-600">{okMsg}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy
              ? "Aguarde…"
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-sm text-zinc-600 hover:text-violet-700"
        >
          {mode === "login"
            ? "Não tem conta? Criar conta"
            : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
