import { CreditBalanceChip } from "@/components/billing/CreditBalanceChip";
import { createClient } from "@/lib/supabase/server";

export async function CreditBalanceNav({
  compact = false,
}: {
  compact?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: wallet } = await supabase
    .from("credit_wallets")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <CreditBalanceChip balance={wallet?.balance ?? 0} compact={compact} />
  );
}
