import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMissingRelationError } from "@/lib/assets/schema";
import { PROFILE_SELECT, type StudioProfile } from "@/lib/profile/types";
import { profileFromRow } from "@/lib/profile/sanitize";
import { assetsRootConfigured } from "@/lib/assets/paths";
import { getAssetStorage } from "@/lib/storage/registry";
import { profileAvatarRelative } from "@/lib/profile/avatar";

export type LoadedProfile = {
  email: string;
  profile: StudioProfile;
  schemaReady: boolean;
  avatarUrl: string | null;
};

export async function loadCurrentProfile(): Promise<
  | { ok: true; userId: string; data: LoadedProfile }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const full = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  let schemaReady = true;
  let row: Record<string, unknown> | null = null;

  if (full.error && isMissingRelationError(full.error)) {
    schemaReady = false;
    const fallback = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    row = (fallback.data as Record<string, unknown> | null) ?? null;
  } else if (full.error) {
    return { ok: false, error: full.error.message };
  } else {
    row = (full.data as Record<string, unknown> | null) ?? null;
  }

  const profile = profileFromRow(row);
  if (!profile.fullName) {
    profile.fullName =
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      user.email?.split("@")[0] ||
      "";
  }

  let avatarUrl: string | null = null;
  if (schemaReady && profile.avatarExt && assetsRootConfigured()) {
    const relative = profileAvatarRelative(user.id, profile.avatarExt);
    if (await getAssetStorage().exists(relative)) {
      const stamp = profile.updatedAt
        ? Date.parse(profile.updatedAt).toString()
        : "1";
      avatarUrl = `/api/profile/avatar?t=${stamp}`;
    }
  }

  return {
    ok: true,
    userId: user.id,
    data: {
      email: user.email ?? "",
      profile,
      schemaReady,
      avatarUrl,
    },
  };
}
