import { getSupabase } from "./supabase";
import { DEFAULT_ORG_ID } from "./properties";

export type UserRole = "buyer" | "broker" | "owner" | "admin";

export async function getCurrentRole(): Promise<UserRole | null> {
  try {
    const { data } = await getSupabase().auth.getUser();
    const role = data.user?.user_metadata?.role as UserRole | undefined;
    return role ?? null;
  } catch {
    return null;
  }
}

export function getCurrentOrgId(): string {
  return DEFAULT_ORG_ID;
}

export function roleDashboardPage(
  role: UserRole | null,
): "broker" | "owner" | "admin" | null {
  if (role === "broker") return "broker";
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  return null;
}

export async function signUpWithRole(
  email: string,
  password: string,
  role: UserRole,
  orgId: string = DEFAULT_ORG_ID,
) {
  return getSupabase().auth.signUp({
    email,
    password,
    options: { data: { role, org_id: orgId } },
  });
}

export async function signInWithRole(email: string, password: string) {
  return getSupabase().auth.signInWithPassword({ email, password });
}
