import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function getSupabase() {
  if (!url || !anonKey) {
    throw new Error(
      "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env do projeto",
    );
  }
  return createClient(url, anonKey);
}
