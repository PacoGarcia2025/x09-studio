import { describe, expect, it } from "vitest";
import {
  briefMissingFromContent,
  extractBriefTokens,
  formatBuilderContext,
  usesDefaultPaletteDespiteBrief,
} from "@/lib/pipeline/brief-context";

describe("brief-context", () => {
  it("extracts brand tokens from brief", () => {
    const tokens = extractBriefTokens(
      "Site imobiliário SGO Imób em Hortolândia. CRECI 38308-J. WhatsApp (19) 99999-0000",
    );
    expect(tokens.some((t) => /SGO|Hortolândia|38308/i.test(t))).toBe(true);
  });

  it("flags violet palette when brief asks olive green", () => {
    expect(
      usesDefaultPaletteDespiteBrief(
        "paleta verde oliva premium",
        '<div className="bg-violet-600 from-violet-600">',
      ),
    ).toBe(true);
  });

  it("flags missing brief keywords in generated home", () => {
    const issues = briefMissingFromContent(
      "Empresa SGO Imób Hortolândia CRECI 38308-J",
      '<div className="p-8"><h1>Imobiliária Premium</h1></div>',
    );
    expect(issues.length).toBeGreaterThan(0);
  });

  it("inclui a galeria no contexto do builder", () => {
    const ctx = formatBuilderContext({
      projectName: "SGO",
      libraryCatalog: "Galeria do cliente: /library/logo-1.png",
    });
    expect(ctx).toContain("/library/logo-1.png");
  });
});
