import { describe, expect, it } from "vitest";
import { isResumeBuildMessage } from "@/lib/pipeline/chat-intent.server";

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
});
