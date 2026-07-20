import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Preview Sandpack: undefined → mock. Vite local: preencha via .env + env_set do Builder.
const url: string | undefined = undefined;
const anonKey: string | undefined = undefined;

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
 * Sem credenciais: devolve mock para a UI não quebrar no preview.
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
