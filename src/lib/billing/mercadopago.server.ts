import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicError } from "@/lib/http/errors";
import { mercadoPago } from "@/lib/mercado-pago";
import {
  isApprovedPayment,
  resolveCreditPurchaseIdentity,
} from "@/lib/billing/mercadopago-payment";

export async function createCreditCheckout(input: {
  userId: string;
  email?: string;
  planCode: "basic" | "pro";
  backUrl: string;
}): Promise<{ initPoint: string; checkoutId: string }> {
  const admin = createAdminClient();
  const { data: plan, error: planError } = await admin
    .from("billing_plans")
    .select("code, name, monthly_credits, amount_cents")
    .eq("code", input.planCode)
    .eq("active", true)
    .maybeSingle();

  if (planError || !plan) {
    throw new PublicError("Plano inválido.", 400);
  }

  const notificationBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://studio.x09.com.br";

  const preference = await mercadoPago().preference.create({
    body: {
      items: [
        {
          id: `x09-${plan.code}`,
          title: `${plan.monthly_credits} créditos X09 Studio`,
          description: `Pacote ${plan.name}`,
          quantity: 1,
          unit_price: plan.amount_cents / 100,
          currency_id: "BRL",
        },
      ],
      payer: input.email ? { email: input.email } : undefined,
      external_reference: `credits:${input.userId}:${plan.code}`,
      metadata: {
        user_id: input.userId,
        package_code: plan.code,
      },
      notification_url: `${notificationBase}/api/webhooks/mercadopago`,
      back_urls: {
        success: input.backUrl,
        pending: input.backUrl,
        failure: input.backUrl,
      },
      auto_return: "approved",
      statement_descriptor: "X09 STUDIO",
    },
  });

  const initPoint = preference.init_point || preference.sandbox_init_point;
  if (!initPoint) {
    throw new PublicError("Checkout Mercado Pago sem URL de retorno.", 502);
  }

  return {
    initPoint,
    checkoutId: String(preference.id),
  };
}

export function verifyMercadoPagoSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Em dev sem secret: aceita só se explicitamente liberado
    return process.env.MP_WEBHOOK_SKIP_VERIFY === "1";
  }
  if (!input.xSignature || !input.dataId) return false;

  const parts = Object.fromEntries(
    input.xSignature.split(",").map((part) => {
      const [k, v] = part.split("=");
      return [k?.trim() ?? "", v?.trim() ?? ""];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${input.dataId};request-id:${input.xRequestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(v1, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function fetchMpResource(
  topic: string,
  id: string,
): Promise<unknown> {
  if (topic === "payment" || topic === "payment.updated") {
    return mercadoPago().payment.get({ id });
  }
  if (topic === "subscription_preapproval" || topic === "preapproval") {
    return mercadoPago().preApproval.get({ id });
  }
  return null;
}

export async function processMercadoPagoWebhook(input: {
  eventId: string;
  topic: string;
  dataId: string;
  payload: unknown;
}): Promise<{ processed: boolean; duplicate?: boolean }> {
  const admin = createAdminClient();

  const { error: insertError } = await admin.from("billing_webhook_events").insert({
    provider: "mercadopago",
    event_id: input.eventId,
    topic: input.topic,
    payload: input.payload as object,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { processed: true, duplicate: true };
    }
    throw new PublicError("Falha ao registrar webhook.", 500);
  }

  try {
    const resource = (await fetchMpResource(input.topic, input.dataId)) as
      | Record<string, unknown>
      | null;

    if (resource) {
      await applyMpResource(resource, input.topic, input.dataId);
    }

    await admin
      .from("billing_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", "mercadopago")
      .eq("event_id", input.eventId);

    return { processed: true };
  } catch (error) {
    await admin
      .from("billing_webhook_events")
      .update({
        error: error instanceof Error ? error.message : "webhook_error",
      })
      .eq("provider", "mercadopago")
      .eq("event_id", input.eventId);
    throw error;
  }
}

async function applyMpResource(
  resource: Record<string, unknown>,
  topic: string,
  dataId: string,
) {
  const admin = createAdminClient();
  const identity = resolveCreditPurchaseIdentity(resource);
  if (!identity) return;
  const { userId, packageCode: planCode } = identity;

  const status = String(resource.status ?? "").toLowerCase();

  if (
    topic.includes("preapproval") ||
    resource.reason ||
    resource.auto_recurring
  ) {
    const mapped =
      status === "authorized"
        ? "authorized"
        : status === "paused"
          ? "paused"
          : status === "cancelled"
            ? "cancelled"
            : "pending";

    await admin
      .from("subscriptions")
      .update({
        status: mapped,
        mp_payer_id: resource.payer_id ? String(resource.payer_id) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("mp_preapproval_id", String(resource.id ?? dataId));
  }

  // Payment data is fetched from Mercado Pago; never trust credits from the
  // webhook body. The package amount comes from our own billing catalog.
  if (
    (topic === "payment" || topic === "payment.updated") &&
    isApprovedPayment(resource)
  ) {
    const { data: plan, error: planError } = await admin
      .from("billing_plans")
      .select("code, monthly_credits")
      .eq("code", planCode)
      .eq("active", true)
      .maybeSingle();

    if (planError || !plan) {
      throw new PublicError("Pacote de créditos desconhecido.", 400);
    }

    const { error: grantError } = await admin.rpc("grant_credit_package", {
      p_user_id: userId,
      p_credits: plan.monthly_credits,
      p_payment_id: String(resource.id ?? dataId),
      p_package_code: plan.code,
    });
    if (grantError) {
      throw new PublicError("Falha ao adicionar créditos.", 500);
    }
  }
}

export async function cancelMercadoPagoSubscription(userId: string) {
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, mp_preapproval_id, status")
    .eq("user_id", userId)
    .in("status", ["pending", "authorized", "paused"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.mp_preapproval_id) {
    throw new PublicError("Nenhuma assinatura ativa.", 404);
  }

  try {
    await mercadoPago().preApproval.update({
      id: sub.mp_preapproval_id,
      body: { status: "cancelled" },
    });
  } catch {
    // Ainda assim marca cancelamento local
    await admin
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);
    throw new PublicError("Mercado Pago recusou o cancelamento.", 502);
  }

  await admin
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  return { ok: true };
}
