"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMissingRelationError } from "@/lib/assets/schema";
import { assetsRootConfigured } from "@/lib/assets/paths";
import { getAssetStorage } from "@/lib/storage/registry";
import {
  detectAvatarExt,
  MAX_AVATAR_BYTES,
  profileAvatarRelative,
} from "@/lib/profile/avatar";
import { PROFILE_AVATAR_EXTS } from "@/lib/profile/types";
import {
  sanitizeCep,
  sanitizePhone,
  sanitizeUf,
  trimField,
} from "@/lib/profile/sanitize";

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; error: string };

function revalidateProfile() {
  revalidatePath("/", "layout");
  revalidatePath("/perfil");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function updateProfileAction(
  formData: FormData,
): Promise<ProfileActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Entre na sua conta para salvar." };

  const fullName = trimField(formData.get("fullName"), 80);
  if (fullName.length < 2) {
    return { ok: false, error: "Escreva o seu nome (mínimo 2 letras)." };
  }

  const patch = {
    full_name: fullName,
    phone: sanitizePhone(formData.get("phone")),
    company: trimField(formData.get("company"), 80),
    address_line: trimField(formData.get("addressLine"), 160),
    city: trimField(formData.get("city"), 80),
    state: sanitizeUf(formData.get("state")),
    postal_code: sanitizeCep(formData.get("postalCode")),
    country: "BR",
  };

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    ...patch,
  });

  if (error && isMissingRelationError(error)) {
    const fallback = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName });
    if (fallback.error) return { ok: false, error: fallback.error.message };
    await supabase.auth.updateUser({ data: { full_name: fullName } });
    revalidateProfile();
    return { ok: true };
  }

  if (error) return { ok: false, error: error.message };

  await supabase.auth.updateUser({ data: { full_name: fullName } });
  revalidateProfile();
  return { ok: true };
}

const SCHEMA_HINT =
  "Os campos novos do perfil ainda não estão no banco. Aplique a migration 20260904140000_profile_contact.sql no Supabase.";

export async function updatePasswordAction(
  formData: FormData,
): Promise<ProfileActionResult> {
  const { supabase, user } = await requireUser();
  if (!user?.email) {
    return { ok: false, error: "Entre na sua conta para alterar a senha." };
  }

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (current.length < 6) {
    return { ok: false, error: "Informe a senha atual." };
  }
  if (next.length < 8) {
    return { ok: false, error: "A senha nova precisa de pelo menos 8 caracteres." };
  }
  if (next !== confirm) {
    return { ok: false, error: "A confirmação não bate com a senha nova." };
  }
  if (next === current) {
    return { ok: false, error: "A senha nova precisa ser diferente da atual." };
  }

  const check = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (check.error) {
    return { ok: false, error: "Senha atual incorreta." };
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, error: error.message };
  revalidateProfile();
  return { ok: true };
}

export async function uploadAvatarAction(
  formData: FormData,
): Promise<ProfileActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Entre na sua conta para enviar a foto." };
  if (!assetsRootConfigured()) {
    return { ok: false, error: "O armazenamento de arquivos ainda não está ligado." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size < 32) {
    return { ok: false, error: "Escolha uma foto ou um logo (PNG, JPG ou WEBP)." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "A imagem pode ter no máximo 3 MB." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = detectAvatarExt(file.name, bytes);
  if (!ext) {
    return { ok: false, error: "Use PNG, JPG ou WEBP." };
  }

  const storage = getAssetStorage();
  for (const old of PROFILE_AVATAR_EXTS) {
    await storage.remove(profileAvatarRelative(user.id, old));
  }
  await storage.writeFile(profileAvatarRelative(user.id, ext), bytes);

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, avatar_ext: ext });
  if (error && isMissingRelationError(error)) {
    return { ok: false, error: SCHEMA_HINT };
  }
  if (error) return { ok: false, error: error.message };

  revalidateProfile();
  return { ok: true };
}

export async function removeAvatarAction(): Promise<ProfileActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  if (assetsRootConfigured()) {
    const storage = getAssetStorage();
    for (const ext of PROFILE_AVATAR_EXTS) {
      await storage.remove(profileAvatarRelative(user.id, ext));
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_ext: null })
    .eq("id", user.id);
  if (error && !isMissingRelationError(error)) {
    return { ok: false, error: error.message };
  }

  revalidateProfile();
  return { ok: true };
}
