"use server";

import { redirect } from "next/navigation";
import { createCreditCheckout } from "@/lib/billing/mercadopago.server";
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

  const { initPoint } = await createCreditCheckout({
    userId: user.id,
    email: user.email,
    planCode,
    backUrl: `${appUrl}/billing?status=return`,
  });

  redirect(initPoint);
}
