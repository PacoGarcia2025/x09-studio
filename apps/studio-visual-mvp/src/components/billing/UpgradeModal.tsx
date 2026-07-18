import { CreditCard, Loader2, Sparkles, X, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { startCheckout } from "@/lib/api-client";

export function UpgradeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loadingPlan, setLoadingPlan] = useState<"basic" | "pro" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function buy(planCode: "basic" | "pro") {
    setLoadingPlan(planCode);
    setError(null);
    try {
      const { initPoint } = await startCheckout(planCode);
      window.location.assign(initPoint);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Não foi possível abrir o checkout.",
      );
      setLoadingPlan(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <section className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 p-6 shadow-[0_0_60px_rgba(99,102,241,0.25)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-indigo-500/20 to-transparent" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex rounded-2xl border border-indigo-400/20 bg-indigo-500/15 p-2.5 text-indigo-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Seus créditos acabaram
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Cada Build custa 1 crédito. Escolha um pacote e continue do
                ponto em que parou.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 shrink-0 rounded-full text-zinc-400"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={Boolean(loadingPlan)}
              onClick={() => void buy("basic")}
              className="rounded-2xl border border-indigo-400/30 bg-indigo-500/15 p-4 text-left transition hover:border-indigo-300/50 hover:bg-indigo-500/20 disabled:opacity-60"
            >
              <Zap className="h-4 w-4 text-indigo-300" />
              <p className="mt-3 font-semibold text-white">100 créditos</p>
              <p className="mt-1 text-xs text-zinc-400">Pacote Básico</p>
            </button>
            <button
              type="button"
              disabled={Boolean(loadingPlan)}
              onClick={() => void buy("pro")}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-indigo-400/35 hover:bg-white/[0.06] disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4 text-indigo-300" />
              <p className="mt-3 font-semibold text-white">500 créditos</p>
              <p className="mt-1 text-xs text-zinc-400">Pacote Pro</p>
            </button>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            disabled={Boolean(loadingPlan)}
            onClick={() => void buy("basic")}
            className="mt-5 w-full rounded-full bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:bg-indigo-400"
          >
            {loadingPlan === "basic" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Comprar Créditos
          </Button>
        </div>
      </section>
    </div>
  );
}
