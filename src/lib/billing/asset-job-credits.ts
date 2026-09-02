import { createServiceClient } from "@/lib/supabase/service-client";

export class AssetJobCreditError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "AssetJobCreditError";
    this.status = status;
    this.code = code;
  }
}

export type AssetJobCreditResult = {
  ok: boolean;
  duplicate?: boolean;
  balance: number;
  amount: number;
};

type LedgerJson = {
  ok?: boolean;
  duplicate?: boolean;
  balance?: number;
  amount?: number;
  error?: string;
  required?: number;
};

async function applyLedger(input: {
  userId: string;
  amount: number;
  reason: "generation_debit" | "refund";
  idempotencyKey: string;
  refId: string;
  meta: Record<string, unknown>;
}): Promise<AssetJobCreditResult> {
  const admin = createServiceClient();
  const { data, error } = await admin.rpc("apply_ledger_entry", {
    p_user_id: input.userId,
    p_amount: input.amount,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
    p_ref_type: "asset_job",
    p_ref_id: input.refId,
    p_meta: input.meta,
  });

  if (error) {
    const detail = error.message?.trim().slice(0, 220);
    throw new AssetJobCreditError(
      detail
        ? `Falha ao atualizar créditos: ${detail}`
        : "Falha ao atualizar créditos.",
      500,
    );
  }

  const result = data as LedgerJson;
  if (!result?.ok) {
    if (result?.error === "insufficient_credits") {
      throw new AssetJobCreditError(
        `Créditos insuficientes. Saldo: ${result.balance ?? 0}. Necessário: ${result.required ?? Math.abs(input.amount)}.`,
        402,
        "insufficient_credits",
      );
    }
    throw new AssetJobCreditError("Não foi possível atualizar créditos.", 500);
  }

  return {
    ok: true,
    duplicate: Boolean(result.duplicate),
    balance: Number(result.balance ?? 0),
    amount: Number(result.amount ?? input.amount),
  };
}

export function assetJobDebitKey(assetId: string): string {
  return `asset-job-debit:${assetId}`;
}

export function assetJobRefundKey(assetId: string): string {
  return `asset-job-refund:${assetId}`;
}

export async function debitAssetJobCredits(input: {
  userId: string;
  amount: number;
  assetId: string;
  meta?: Record<string, unknown>;
}): Promise<AssetJobCreditResult> {
  if (input.amount <= 0) {
    return { ok: true, duplicate: false, balance: 0, amount: 0 };
  }
  return applyLedger({
    userId: input.userId,
    amount: -input.amount,
    reason: "generation_debit",
    idempotencyKey: assetJobDebitKey(input.assetId),
    refId: input.assetId,
    meta: { kind: "mesh", cost: input.amount, ...(input.meta ?? {}) },
  });
}

export async function refundAssetJobCredits(input: {
  userId: string;
  amount: number;
  assetId: string;
}): Promise<AssetJobCreditResult> {
  if (input.amount <= 0) {
    return { ok: true, duplicate: false, balance: 0, amount: 0 };
  }
  return applyLedger({
    userId: input.userId,
    amount: input.amount,
    reason: "refund",
    idempotencyKey: assetJobRefundKey(input.assetId),
    refId: input.assetId,
    meta: { kind: "mesh", refund: input.amount },
  });
}

export async function refundReservedAssetJobCredits(job: {
  created_by: string;
  asset_id: string | null;
  credits_reserved: number;
}): Promise<void> {
  if (!job.asset_id || job.credits_reserved <= 0) return;
  await refundAssetJobCredits({
    userId: job.created_by,
    amount: job.credits_reserved,
    assetId: job.asset_id,
  });
}
