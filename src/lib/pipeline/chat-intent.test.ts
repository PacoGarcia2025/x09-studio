import { describe, expect, it } from "vitest";
import { isResumeBuildMessage } from "@/lib/pipeline/chat-intent.server";
import { isDeterministicVisualMessage } from "@/lib/pipeline/visual-tweaks";

describe("isResumeBuildMessage", () => {
  it("detecta continue de onde parou (inglês e português)", () => {
    expect(isResumeBuildMessage("continue de onde parou")).toBe(true);
    expect(isResumeBuildMessage("continuar de onde parou")).toBe(true);
    expect(isResumeBuildMessage("Continuar onde parou")).toBe(true);
  });

  it("detecta retomar geração", () => {
    expect(isResumeBuildMessage("retomar a geração do site")).toBe(true);
    expect(isResumeBuildMessage("continuar a construção do app")).toBe(true);
  });

  it("não confunde com edição de seção", () => {
    expect(isResumeBuildMessage("mude a cor do hero")).toBe(false);
    expect(isResumeBuildMessage("adicione uma seção de depoimentos")).toBe(false);
  });

  it("não trata pedido de imagens como retomar build", () => {
    expect(isResumeBuildMessage("as imagens não estão aparecendo")).toBe(false);
    expect(isResumeBuildMessage("a frase na hero esta muito centralizado")).toBe(
      false,
    );
  });

  it("trata pedido de GLB no hero como edição visual", () => {
    expect(
      isDeterministicVisualMessage("vc não consegue colocar o GLB na hero?"),
    ).toBe(true);
    expect(
      isDeterministicVisualMessage(
        "analise novamente e veja que tenho um arquivo GLB",
      ),
    ).toBe(true);
  });
});
