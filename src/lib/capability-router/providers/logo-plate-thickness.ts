/** Grossura no eixo Z, em unidades do mesh (largura ≈ 1). */
export const LOGO_THICKNESS_MIN = 0.04;
export const LOGO_THICKNESS_MAX = 0.32;
export const LOGO_THICKNESS_DEFAULT = 0.12;

export function clampLogoThickness(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return LOGO_THICKNESS_DEFAULT;
  return Math.min(LOGO_THICKNESS_MAX, Math.max(LOGO_THICKNESS_MIN, n));
}

/** Nível 1–10 na UI → grossura no mesh. */
export function logoThicknessFromLevel(level: number): number {
  const t = Math.round(Math.min(10, Math.max(1, level)));
  return (
    LOGO_THICKNESS_MIN +
    ((t - 1) / 9) * (LOGO_THICKNESS_MAX - LOGO_THICKNESS_MIN)
  );
}
