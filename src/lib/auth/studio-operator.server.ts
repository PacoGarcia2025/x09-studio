import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isStudioOperatorEmail } from "@/lib/auth/studio-operator";

export async function isCurrentUserStudioOperator(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isStudioOperatorEmail(user?.email);
}
