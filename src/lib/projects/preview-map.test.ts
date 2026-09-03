import { describe, expect, it } from "vitest";
import {
  rewriteLibrarySrcsForPreview,
  sanitizeCodeForSandpack,
  stripForbiddenPreviewImports,
} from "@/lib/projects/preview-map";

describe("stripForbiddenPreviewImports", () => {
  it("remove import de @google/model-viewer e deixa a tag", () => {
    const src = `// @ts-ignore
import '@google/model-viewer';

export function HomePage() {
  return <model-viewer src="/library/nave.glb"></model-viewer>;
}
`;
    const out = sanitizeCodeForSandpack(src);
    expect(out).not.toContain("@google/model-viewer");
    expect(out).toContain("<model-viewer");
    expect(stripForbiddenPreviewImports(src)).not.toContain(
      "@google/model-viewer",
    );
  });
});

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
