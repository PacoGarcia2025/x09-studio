import { describe, expect, it } from "vitest";
import { discoverProjectHints } from "./index";

describe("discovery engine", () => {
  it("ranks both business and visual intents for a premium real-estate brief", () => {
    const result = discoverProjectHints({
      query: "landing imobiliaria premium com hero cinematic e cards de imóveis",
      segment: "imobiliaria",
      constraints: ["premium", "hero", "cards"],
    });

    expect(result.ranked.length).toBeGreaterThan(0);
    expect(result.ranked[0]?.label.toLowerCase()).toContain("imobiliaria");
    expect(result.ranked[0]?.score).toBeGreaterThan(0);
  });
});
