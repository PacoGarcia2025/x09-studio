import { GitBranch, Loader2, Lock, Mail, UserPlus, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user-store";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

type AuthTab = "login" | "signup";

export function AuthModal({ open, onClose }: AuthModalProps) {
  const setSession = useUserStore((state) => state.setSession);
  const fetchProfile = useUserStore((state) => state.fetchProfile);

  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setInfo(null);
    setPassword("");
  }, [open, tab]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleGitHubOAuth() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/`;
      // Supabase exchange happens on Next BFF when using hosted callback;
      // for Vite MVP we use the current origin + Supabase redirect allow-list.
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo,
          scopes: "read:user user:email",
          queryParams: { access_type: "online" },
        },
      });
      if (oauthError) setError(oauthError.message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao iniciar login GitHub.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (tab === "login") {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        setSession(data.session);
        await fetchProfile();
        onClose();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        setSession(data.session);
        await fetchProfile();
        onClose();
        return;
      }

      // Confirmação de e-mail pode estar ativa no projeto Supabase
      setInfo(
        "Conta criada! Verifique seu e-mail para confirmar o cadastro e depois faça login.",
      );
      setTab("login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha inesperada na autenticação.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-glow">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-violet-600/25 via-fuchsia-500/10 to-transparent" />

        <div className="relative flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              {tab === "login" ? "Entrar no Studio" : "Criar conta"}
            </h2>
            <p className="mt-1 text-xs text-secondary">
              Salve seu perfil e personalize os sites gerados pela IA.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative px-6 pt-5">
          <div className="inline-flex rounded-xl border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition",
                tab === "login"
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-glow"
                  : "text-secondary hover:text-primary",
              )}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setTab("signup")}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition",
                tab === "signup"
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-glow"
                  : "text-secondary hover:text-primary",
              )}
            >
              Cadastro
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={() => void handleGitHubOAuth()}
            className="w-full border border-white/15 bg-white/5 text-primary hover:bg-white/10"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitBranch className="h-4 w-4" />
            )}
            Continuar com GitHub
          </Button>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-secondary">
            <span className="h-px flex-1 bg-white/10" />
            ou e-mail
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="auth-email"
              className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-secondary"
            >
              <Mail className="h-3.5 w-3.5" />
              E-mail
            </label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              placeholder="voce@empresa.com"
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="auth-password"
              className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-secondary"
            >
              <Lock className="h-3.5 w-3.5" />
              Senha
            </label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={
                tab === "login" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              placeholder="Mínimo 6 caracteres"
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}

          {info ? (
            <p className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-primary">
              {info}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white",
              "shadow-glow hover:from-violet-500 hover:to-fuchsia-500",
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : tab === "login" ? (
              <Lock className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {loading
              ? "Aguarde…"
              : tab === "login"
                ? "Entrar"
                : "Criar conta"}
          </Button>
        </form>
      </div>
    </div>
  );
}
