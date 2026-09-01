import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/** Client de serviço (bypassa RLS). Sem `server-only` — o worker isolado também usa. */
export function createServiceClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
