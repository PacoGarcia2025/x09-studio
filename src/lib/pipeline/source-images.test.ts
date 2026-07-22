import { describe, expect, it } from "vitest";
import {
  fixBrokenImagesInSource,
  hasBrokenImageSources,
  isBrokenImageSrc,
} from "@/lib/pipeline/source-images";

describe("source-images", () => {
  it("detecta src relativos e placeholders", () => {
    expect(isBrokenImageSrc("/imagem.jpg")).toBe(true);
    expect(isBrokenImageSrc("Imóvel 1")).toBe(true);
    expect(
      isBrokenImageSrc(
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200",
      ),
    ).toBe(false);
  });

  it("substitui img quebradas por Unsplash", () => {
    const input = `<img src="/foto.jpg" alt="Imóvel 1" />`;
    const out = fixBrokenImagesInSource(input);
    expect(out).toMatch(/images\.unsplash\.com/);
    expect(hasBrokenImageSources(out)).toBe(false);
  });
});
