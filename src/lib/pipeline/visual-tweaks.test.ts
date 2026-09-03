import { describe, expect, it } from "vitest";
import {
  injectFullscreenHeroGlb,
  isGlbHeroMessage,
  isHeroWidenMessage,
  isImageFixMessage,
  rewriteMissingLibrarySrcs,
  widenHeroCopy,
} from "@/lib/pipeline/visual-tweaks";

describe("visual-tweaks", () => {
  it("detecta pedido de imagens, hero largo e GLB no hero", () => {
    expect(isImageFixMessage("as imagens não estão aparecendo")).toBe(true);
    expect(isHeroWidenMessage("a frase na hero esta muito centralizado")).toBe(
      true,
    );
    expect(
      isGlbHeroMessage(
        "consegue colocar a imagem que tenho em glb na hero com tamanho que ocupe a tela",
      ),
    ).toBe(true);
    expect(
      isGlbHeroMessage("analise novamente e veja que tenho um arquivo GLB"),
    ).toBe(true);
    expect(isGlbHeroMessage("vc não consegue colocar o GLB na hero?")).toBe(
      true,
    );
    expect(isGlbHeroMessage("o que é um arquivo GLB?")).toBe(false);
  });

  it("alarga max-w do hero centrado", () => {
    const src = `<h1 className="max-w-xl mx-auto text-center">X09</h1>`;
    expect(widenHeroCopy(src)).toContain("max-w-5xl mx-auto");
  });

  it("mantém /library/ existente e GLB; só troca foto em falta", () => {
    const src = `src:"/library/logo-aaaa-marca.png" src:"/library/missing.png" src:"/library/mesh-bbbb-nave.glb"`;
    const out = rewriteMissingLibrarySrcs(
      src,
      new Set(["logo-aaaa-marca.png"]),
    );
    expect(out).toContain("/library/logo-aaaa-marca.png");
    expect(out).toMatch(/images\.unsplash\.com/);
    expect(out).not.toContain("/library/missing.png");
    expect(out).toContain("/library/mesh-bbbb-nave.glb");
  });

  it("injeta HeroGlb a ecrã inteiro no return da Home", () => {
    const src = `export default function HomePage() {
  return (
    <div className="min-h-screen">ola</div>
  );
}
`;
    const out = injectFullscreenHeroGlb(src, "/library/mesh-cccc-nave.glb");
    expect(out).toContain('from "../components/HeroGlb"');
    expect(out).toContain('<HeroGlb src="/library/mesh-cccc-nave.glb" />');
    expect(out).toContain("</div>");
    expect(out).toContain("</>");
  });

  it("remove import npm de model-viewer e a tag duplicada", () => {
    const src = `import '@google/model-viewer';

export function HomePage() {
  return (
    <div>
      <model-viewer src="/library/old.glb"></model-viewer>
      <h1>X09</h1>
    </div>
  );
}
`;
    const out = injectFullscreenHeroGlb(src, "/library/mesh-cccc-nave.glb");
    expect(out).not.toContain("@google/model-viewer");
    expect(out).not.toMatch(/<model-viewer[\s\S]*src="\/library\/old/);
    expect(out).toContain('<HeroGlb src="/library/mesh-cccc-nave.glb" />');
  });
});
