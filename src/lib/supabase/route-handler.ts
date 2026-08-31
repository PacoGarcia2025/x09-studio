import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

export async function createRouteHandlerClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export function authConnectivityMessage(cause: unknown): string {
  const msg = cause instanceof Error ? cause.message : String(cause);
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|getaddrinfo/i.test(msg)) {
    return "Não foi possível conectar ao Supabase. Confira NEXT_PUBLIC_SUPABASE_URL no .env (projeto ativo em supabase.com) e rode npm run validate:supabase.";
  }
  return msg || "Falha na autenticação";
}
