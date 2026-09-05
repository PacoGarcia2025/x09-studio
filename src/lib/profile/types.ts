export const PROFILE_AVATAR_EXTS = ["png", "jpg", "webp"] as const;
export type ProfileAvatarExt = (typeof PROFILE_AVATAR_EXTS)[number];

export const PROFILE_SELECT =
  "full_name, phone, company, address_line, city, state, postal_code, country, avatar_ext, updated_at";

export type StudioProfile = {
  fullName: string;
  phone: string;
  company: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  avatarExt: ProfileAvatarExt | null;
  updatedAt: string | null;
};

export function emptyStudioProfile(): StudioProfile {
  return {
    fullName: "",
    phone: "",
    company: "",
    addressLine: "",
    city: "",
    state: "",
    postalCode: "",
    country: "BR",
    avatarExt: null,
    updatedAt: null,
  };
}

export function isProfileAvatarExt(value: unknown): value is ProfileAvatarExt {
  return value === "png" || value === "jpg" || value === "webp";
}
