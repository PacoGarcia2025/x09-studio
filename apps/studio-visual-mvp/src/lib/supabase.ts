import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://example.supabase.co";
const FALLBACK_KEY = "sb_publishable_placeholder";

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!envUrl?.trim() || !envKey?.trim()) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes no .env.local — usando placeholder (CI/testes).",
  );
}

export const supabase = createClient(
  envUrl?.trim() || FALLBACK_URL,
  envKey?.trim() || FALLBACK_KEY,
);
