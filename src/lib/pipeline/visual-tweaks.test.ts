import { describe, expect, it } from "vitest";
import {
  isHeroWidenMessage,
  isImageFixMessage,
  rewriteMissingLibrarySrcs,
  widenHeroCopy,
} from "@/lib/pipeline/visual-tweaks";

describe("visual-tweaks", () => {
  it("detecta pedido de imagens e hero largo", () => {
    expect(isImageFixMessage("as imagens não estão aparecendo")).toBe(true);
    expect(isHeroWidenMessage("a frase na hero esta muito centralizado")).toBe(
      true,
    );
  });

  it("alarga max-w do hero centrado", () => {
    const src = `<h1 className="max-w-xl mx-auto text-center">X09</h1>`;
    expect(widenHeroCopy(src)).toContain("max-w-5xl mx-auto");
  });

  it("mantém /library/ existente e troca o que falta", () => {
    const src = `src:"/library/logo-aaaa-marca.png" src:"/library/missing.png"`;
    const out = rewriteMissingLibrarySrcs(
      src,
      new Set(["logo-aaaa-marca.png"]),
    );
    expect(out).toContain("/library/logo-aaaa-marca.png");
    expect(out).toMatch(/images\.unsplash\.com/);
    expect(out).not.toContain("/library/missing.png");
  });
});
