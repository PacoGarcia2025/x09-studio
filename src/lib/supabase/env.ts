/**
 * Env helpers do X09 Studio.
 * Usa as API keys atuais do Supabase (publishable + secret).
 * Aceita aliases legados de NOME de variável apenas para transição de arquivos
 * .env — os VALORES devem ser sb_publishable_... / sb_secret_...
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

/** Chave pública (browser + SSR com RLS). Preferir publishable. */
export function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    key,
  );
}

/** Chave secreta somente backend (bypassa RLS). Preferir secret. */
export function getSupabaseSecretKey(): string {
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  return required(
    "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)",
    key,
  );
}
