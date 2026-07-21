import { describe, expect, it } from "vitest";
import { isImobiliaria360 } from "@/lib/skills/detect";

describe("isImobiliaria360", () => {
  it("detecta site imobiliário SGO-style", () => {
    expect(
      isImobiliaria360(
        "Crie um site de alta performance para a imobiliária SGO Imóveis, catálogo de imóveis de alto padrão boutique",
      ),
    ).toBe(true);
  });
});

function formatBrokenImportMessage(
  broken: Array<{ file: string; spec: string }>,
): string {
  if (broken.length === 0) return "";
  const first = broken[0]!;
  const extra =
    broken.length > 1 ? ` (+${broken.length - 1} import(s) quebrado(s))` : "";
  return `Import quebrado: "${first.spec}" em ${first.file}${extra}`;
}

describe("formatBrokenImportMessage", () => {
  it("formata primeira falha de import", () => {
    const msg = formatBrokenImportMessage([
      { file: "src/App.tsx", spec: "./pages/ListingsPage" },
    ]);
    expect(msg).toContain("ListingsPage");
    expect(msg).toContain("src/App.tsx");
  });
});
