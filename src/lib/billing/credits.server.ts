import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicError } from "@/lib/http/errors";
import {
  creditCostFor,
  resolveBillableMode,
  type BillableMode,
} from "@/lib/billing/credits";
import type { ResolvedMode } from "@/lib/agent/schemas";

export type DebitResult = {
  ok: boolean;
  duplicate?: boolean;
  balance: number;
  amount: number;
  billable: BillableMode;
  cost: number;
};

export async function debitForGeneration(input: {
  userId: string;
  mode: ResolvedMode;
  phase?: "auto" | "plan" | "build" | "repair";
  clientRequestId: string;
}): Promise<DebitResult> {
  const billable = resolveBillableMode({
    mode: input.mode,
    phase: input.phase,
  });
  const cost = creditCostFor(billable);

  if (billable === "skip" || cost === 0) {
    const balance = await getWalletBalance(input.userId);
    return {
      ok: true,
      duplicate: false,
      balance,
      amount: 0,
      billable,
      cost: 0,
    };
  }

  const admin = createAdminClient();
  const rpcMode = billable === "edit" ? "edit" : "generation";
  const { data, error } = await admin.rpc("debit_generation_credits", {
    p_user_id: input.userId,
    p_mode: rpcMode,
    p_idempotency_key: input.clientRequestId,
  });

  if (error) {
    throw new PublicError("Falha ao debitar créditos.", 500);
  }

  const result = data as {
    ok?: boolean;
    duplicate?: boolean;
    balance?: number;
    amount?: number;
    error?: string;
    required?: number;
  };

  if (!result?.ok) {
    if (result?.error === "insufficient_credits") {
      throw new PublicError(
        `Créditos insuficientes. Saldo: ${result.balance ?? 0}. Necessário: ${result.required ?? cost}.`,
        402,
        "insufficient_credits",
      );
    }
    throw new PublicError("Não foi possível debitar créditos.", 500);
  }

  return {
    ok: true,
    duplicate: Boolean(result.duplicate),
    balance: Number(result.balance ?? 0),
    amount: Number(result.amount ?? -cost),
    billable,
    cost,
  };
}

export async function getWalletBalance(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.balance ?? 0;
}

export async function getBillingSnapshot(userId: string) {
  const admin = createAdminClient();
  const [wallet, subscription, plans] = await Promise.all([
    admin
      .from("credit_wallets")
      .select("balance, lifetime_granted, lifetime_spent, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("subscriptions")
      .select(
        "id, plan_code, status, current_period_start, current_period_end, cancel_at_period_end, mp_preapproval_id",
      )
      .eq("user_id", userId)
      .in("status", ["pending", "authorized", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("billing_plans")
      .select("code, name, monthly_credits, amount_cents, currency, active")
      .eq("active", true)
      .order("monthly_credits", { ascending: true }),
  ]);

  return {
    wallet: wallet.data ?? {
      balance: 0,
      lifetime_granted: 0,
      lifetime_spent: 0,
      updated_at: null,
    },
    subscription: subscription.data ?? null,
    plans: plans.data ?? [],
    costs: { generation: 1, edit: 1 },
  };
}
