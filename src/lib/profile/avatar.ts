import { assertAssetUuid } from "@/lib/assets/paths";
import { isProfileAvatarExt, type ProfileAvatarExt } from "@/lib/profile/types";

export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export function profileAvatarRelative(
  userId: string,
  ext: ProfileAvatarExt,
): string {
  assertAssetUuid(userId, "userId");
  const safe = ext === "jpg" ? "jpg" : ext;
  return `profiles/${userId}/avatar.${safe}`;
}

export function detectAvatarExt(
  name: string,
  bytes: Uint8Array,
): ProfileAvatarExt | null {
  const fromName = name.split(".").pop()?.toLowerCase() ?? "";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  if (fromName === "jpeg" || fromName === "jpg") return "jpg";
  if (isProfileAvatarExt(fromName)) return fromName;
  return null;
}
