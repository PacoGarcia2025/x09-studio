import { describe, expect, it } from "vitest";
import { detectAvatarExt } from "@/lib/profile/avatar";
import {
  sanitizeCep,
  sanitizePhone,
  sanitizeUf,
  trimField,
} from "@/lib/profile/sanitize";

describe("profile sanitize", () => {
  it("corta telefone e aceita DDD", () => {
    expect(sanitizePhone(" (48) 99999-1111 ")).toBe("(48) 99999-1111");
    expect(sanitizePhone("abc<script>")).toBe("");
  });

  it("normaliza UF e CEP", () => {
    expect(sanitizeUf("sc")).toBe("SC");
    expect(sanitizeCep("88010-000 extra")).toBe("88010-000");
  });

  it("limita nome", () => {
    expect(trimField("  Ana  ", 80)).toBe("Ana");
  });
});

describe("detectAvatarExt", () => {
  it("reconhece PNG pelo cabeçalho", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectAvatarExt("x.bin", png)).toBe("png");
  });
});
