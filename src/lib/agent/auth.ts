import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

export type AuthUser = {
  id: string;
  email?: string;
};

/**
 * Valida Bearer token do Vite MVP (ou cookie via fallback).
 */
export async function requireUserFromRequest(
  request: Request,
): Promise<AuthUser> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) {
    throw new AuthError("Faça login para gerar com o X09.");
  }

  const supabase = createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new AuthError("Sessão inválida ou expirada. Entre novamente.");
  }

  return { id: data.user.id, email: data.user.email ?? undefined };
}

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Rate limit simples em memória por user (por processo). */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function assertRateLimit(userId: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(userId);
  if (!current || current.resetAt < now) {
    buckets.set(userId, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    const err = new Error("Muitas requisições. Aguarde um minuto.");
    (err as Error & { status: number }).status = 429;
    throw err;
  }
}
