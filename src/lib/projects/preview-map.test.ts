import { describe, expect, it } from "vitest";
import { rewriteLibrarySrcsForPreview } from "@/lib/projects/preview-map";

describe("rewriteLibrarySrcsForPreview", () => {
  it("prefixa /library/ com a origem pública do Studio", () => {
    const out = rewriteLibrarySrcsForPreview(
      `src:"/library/image-4b6d0f6e-hero.png"`,
      "https://studio.x09.com.br/api/public/library/demo",
    );
    expect(out).toBe(
      `src:"https://studio.x09.com.br/api/public/library/demo/image-4b6d0f6e-hero.png"`,
    );
  });
});
