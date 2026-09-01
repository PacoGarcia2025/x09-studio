import { describe, expect, it } from "vitest";
import {
  classifyUpload,
  extensionOf,
  isAllowedByteSize,
  MAX_ASSET_BYTES,
  sanitizeOriginalName,
} from "@/lib/assets/classify";
import { buildAssetRelativeFile } from "@/lib/assets/paths";
import { isAssetKind } from "@/lib/assets/kinds";

describe("classificação de upload", () => {
  it("infere kind pela extensão — não pelo nome GLB", () => {
    const png = classifyUpload("hero.png");
    expect("kind" in png && png.kind).toBe("image");
    const hdr = classifyUpload("studio.hdr");
    expect("kind" in hdr && hdr.kind).toBe("hdri");
    const mesh = classifyUpload("prop.glb");
    expect("kind" in mesh && mesh.kind).toBe("mesh");
    expect(isAssetKind("glb")).toBe(false);
    expect(isAssetKind("hdri")).toBe(true);
  });

  it("aceita override genérico (png como textura)", () => {
    const result = classifyUpload("wood.png", "texture");
    expect("kind" in result && result.kind).toBe("texture");
  });

  it("bloqueia executáveis e scripts", () => {
    expect(classifyUpload("payload.exe")).toEqual(
      expect.objectContaining({ error: expect.any(String) }),
    );
    expect(classifyUpload("x.js")).toEqual(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("rejeita extensão desconhecida sem override other", () => {
    const result = classifyUpload("notes.xyz");
    expect("error" in result).toBe(true);
  });

  it("limita tamanho", () => {
    expect(isAllowedByteSize(1)).toBe(true);
    expect(isAllowedByteSize(MAX_ASSET_BYTES + 1)).toBe(false);
    expect(isAllowedByteSize(0)).toBe(false);
  });

  it("sanitiza nome e monta path estável", () => {
    expect(sanitizeOriginalName("..\\foto linda.png")).toBe("foto linda.png");
    expect(extensionOf("a.B.PNG")).toBe("png");
    const rel = buildAssetRelativeFile(
      "11111111-1111-1111-1111-111111111111",
      "image",
      "22222222-2222-2222-2222-222222222222",
      "png",
    );
    expect(rel).toBe(
      "11111111-1111-1111-1111-111111111111/image/22222222-2222-2222-2222-222222222222/source.png",
    );
  });

  it("bloqueia path traversal no builder via uuid inválido", () => {
    expect(() =>
      buildAssetRelativeFile("../x", "image", "22222222-2222-2222-2222-222222222222", "png"),
    ).toThrow(/inválido/);
  });
});
