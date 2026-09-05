import { emptyStudioProfile, isProfileAvatarExt, type StudioProfile } from "@/lib/profile/types";

export function trimField(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizePhone(value: unknown): string {
  return String(value ?? "")
    .replace(/[^\d+()\-\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

export function sanitizeUf(value: unknown): string {
  return String(value ?? "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 2);
}

export function sanitizeCep(value: unknown): string {
  return String(value ?? "")
    .replace(/[^\d-]/g, "")
    .slice(0, 10);
}

export function profileFromRow(row: Record<string, unknown> | null): StudioProfile {
  const base = emptyStudioProfile();
  if (!row) return base;
  return {
    fullName: trimField(row.full_name, 80),
    phone: sanitizePhone(row.phone),
    company: trimField(row.company, 80),
    addressLine: trimField(row.address_line, 160),
    city: trimField(row.city, 80),
    state: sanitizeUf(row.state),
    postalCode: sanitizeCep(row.postal_code),
    country: trimField(row.country, 2) || "BR",
    avatarExt: isProfileAvatarExt(row.avatar_ext) ? row.avatar_ext : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}
