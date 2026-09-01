import "server-only";
import { createServiceClient } from "@/lib/supabase/service-client";

/** Admin client — só no server Next. Usa Secret Key (nunca no browser). */
export function createAdminClient() {
  return createServiceClient();
}
