"use server";

import { redirect } from "next/navigation";
import { createCreditCheckout } from "@/lib/billing/mercadopago.server";
import { PublicError } from "@/lib/http/errors";
import { createClient } from "@/lib/supabase/server";

export async function startPlanCheckout(formData: FormData) {
  const planCodeRaw = String(formData.get("planCode") ?? "");
  const planCode =
    planCodeRaw === "pro" || planCodeRaw === "basic" ? planCodeRaw : null;

  if (!planCode) {
    redirect("/billing");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/billing");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://studio.x09.com.br";

  try {
    const { initPoint } = await createCreditCheckout({
      userId: user.id,
      email: user.email,
      planCode,
      backUrl: `${appUrl}/billing?status=return`,
    });
    redirect(initPoint);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    if (error instanceof PublicError && error.status === 503) {
      redirect("/billing?error=mp");
    }
    redirect("/billing?error=checkout");
  }
}
