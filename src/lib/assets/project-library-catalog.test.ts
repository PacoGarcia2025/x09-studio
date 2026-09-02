import { describe, expect, it } from "vitest";
import {
  classifyLibraryRole,
  fileSlug,
  formatLibraryCatalogPrompt,
  pickLibraryAssets,
} from "@/lib/assets/project-library-catalog";

describe("project library catalog", () => {
  it("classifica logo, foto e mesh", () => {
    expect(
      classifyLibraryRole({
        kind: "image",
        original_name: "marca-logo.png",
      }),
    ).toBe("logo");
    expect(
      classifyLibraryRole({
        kind: "mesh",
        original_name: "carro-texto.glb",
      }),
    ).toBe("mesh");
    expect(
      classifyLibraryRole({
        kind: "mesh",
        original_name: "x-logo.glb",
        meta: { capability: "mesh.logo" },
      }),
    ).toBe("logo");
    expect(
      classifyLibraryRole({ kind: "audio", original_name: "loop.mp3" }),
    ).toBeNull();
  });

  it("escolhe ficheiros prontos e gera paths /library/", () => {
    const picked = pickLibraryAssets([
      {
        id: "aaaaaaaa-1111-1111-1111-111111111111",
        kind: "image",
        original_name: "Logo X09.png",
        storage_path: "w/image/a/source.png",
        byte_size: 1200,
        meta: {},
        status: "ready",
      },
      {
        id: "bbbbbbbb-2222-2222-2222-222222222222",
        kind: "mesh",
        original_name: "hero-objeto.glb",
        storage_path: "w/mesh/b/source.glb",
        byte_size: 0,
        meta: {},
        status: "ready",
      },
      {
        id: "cccccccc-3333-3333-3333-333333333333",
        kind: "mesh",
        original_name: "carro.glb",
        storage_path: "w/mesh/c/source.glb",
        byte_size: 8000,
        meta: {},
        status: "ready",
      },
    ]);
    expect(picked).toHaveLength(2);
    expect(picked[0]?.publicPath).toMatch(/^\/library\/logo-aaaaaaaa-logo-x09\.png$/);
    expect(picked[1]?.role).toBe("mesh");
  });

  it("formata o prompt sem nomes de motores", () => {
    const text = formatLibraryCatalogPrompt([
      {
        id: "1",
        kind: "image",
        originalName: "logo.png",
        role: "logo",
        publicPath: "/library/logo-1-logo.png",
      },
    ]);
    expect(text).toContain("/library/logo-1-logo.png");
    expect(text).not.toMatch(/meshy|runpod/i);
    expect(fileSlug("Carro Vermelho.glb")).toBe("carro-vermelho");
  });
});
