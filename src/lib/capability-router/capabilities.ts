/**
 * Vocabulário estável que o Studio usa. Nenhum motor aparece aqui.
 * Jobs: capability = kind.operation, com exceção de ingest → asset.ingest
 */
export const CAPABILITIES = [
  "asset.ingest",
  "mesh.generate",
  "mesh.logo",
  "mesh.optimize",
  "mesh.convert",
  "image.generate",
  "image.edit",
  "image.upscale",
  "image.remove_background",
  "texture.generate",
  "material.generate",
  "hdri.generate",
  "audio.generate",
  "speech.generate",
  "speech.transcribe",
  "video.generate",
  "animation.generate",
  "animation.retarget",
  "preview.generate",
  "thumbnail.generate",
] as const;

export type CapabilityId = (typeof CAPABILITIES)[number];

export function isCapabilityId(value: string): value is CapabilityId {
  return (CAPABILITIES as readonly string[]).includes(value);
}
