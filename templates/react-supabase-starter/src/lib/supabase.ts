import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

function mockQuery() {
  const result = { data: [] as unknown[], error: null };
  const chain = {
    select: async () => result,
    insert: async () => ({ data: null, error: null }),
    update: () => ({
      eq: async () => ({ data: null, error: null }),
    }),
    delete: () => ({
      eq: async () => ({ data: null, error: null }),
    }),
    eq: async () => result,
  };
  return chain;
}

/**
 * Cliente Supabase do app gerado.
 * Sem env (preview Sandpack): devolve mock para a UI não quebrar.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  if (url && anonKey) {
    client = createClient(url, anonKey);
    return client;
  }

  client = {
    auth: {
      signInWithPassword: async ({ email }: { email: string; password: string }) => ({
        data: { user: { id: "demo", email }, session: null },
        error: null,
      }),
      signUp: async ({ email }: { email: string; password: string }) => ({
        data: { user: { id: "demo", email }, session: null },
        error: null,
      }),
      signOut: async () => ({ error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: () => mockQuery(),
  } as unknown as SupabaseClient;

  return client;
}

export const supabase = getSupabase();
