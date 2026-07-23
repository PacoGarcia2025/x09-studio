import { describe, expect, it } from "vitest";
import {
  injectPublishHeadAssets,
  PUBLISH_HEAD_ASSETS,
} from "@/lib/publish/publish-assets";

describe("injectPublishHeadAssets", () => {
  it("injeta Tailwind CDN quando ausente", () => {
    const html = `<!doctype html><html><head><title>T</title></head><body></body></html>`;
    const out = injectPublishHeadAssets(html);
    expect(out).toContain("cdn.tailwindcss.com");
    expect(out).toContain("leaflet.css");
  });

  it("não duplica tags", () => {
    const html = injectPublishHeadAssets(
      `<!doctype html><html><head></head><body></body></html>`,
    );
    const out = injectPublishHeadAssets(html);
    expect(
      (out.match(/cdn\.tailwindcss\.com/g) ?? []).length,
    ).toBe(1);
  });

  it("inclui todos os assets do Sandpack", () => {
    expect(PUBLISH_HEAD_ASSETS.length).toBeGreaterThanOrEqual(4);
  });
});
