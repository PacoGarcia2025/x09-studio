/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base do BFF Next (vazio = same-origin / proxy Vite). */
  readonly VITE_API_BASE: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.css";
