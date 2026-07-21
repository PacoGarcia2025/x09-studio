import { describe, expect, it } from "vitest";

function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(message.trim());
  return `https://wa.me/${digits}?text=${text}`;
}

describe("buildWhatsAppUrl", () => {
  it("monta link wa.me com texto codificado", () => {
    const url = buildWhatsAppUrl(
      "5511999999999",
      "Olá, tenho interesse no imóvel Cobertura - Ref:1",
    );
    expect(url).toMatch(/^https:\/\/wa\.me\/5511999999999\?text=/);
    expect(decodeURIComponent(url.split("text=")[1] ?? "")).toContain("Ref:1");
  });
});

function formatPriceShort(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const label = millions.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: millions >= 10 ? 0 : 1,
    });
    return `R$ ${label}M`;
  }
  if (value >= 10_000) {
    const thousands = Math.round(value / 1_000);
    return `R$ ${thousands.toLocaleString("pt-BR")}k`;
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

describe("formatPriceShort", () => {
  it("formata milhões compactos", () => {
    expect(formatPriceShort(2_500_000)).toBe("R$ 2,5M");
    expect(formatPriceShort(12_800_000)).toBe("R$ 12,8M");
  });
});
