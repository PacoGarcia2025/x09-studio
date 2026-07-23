import { describe, expect, it } from "vitest";
import {
  injectPublishHeadAssets,
  PUBLISH_HEAD_ASSETS,
  sanitizePublishedIndexHtml,
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

describe("sanitizePublishedIndexHtml", () => {
  it("remove script corrompido com URL Unsplash", () => {
    const html = `<!doctype html><html><head><script type="module" src="/assets/index-abc.js"></script></head><body><div id="root"></div><script type="module" src="https://images.unsplash.com/photo-123?w=1200"></script></body></html>`;
    const out = sanitizePublishedIndexHtml(html);
    expect(out).not.toContain("photo-123");
    expect(out).toContain("/assets/index-abc.js");
  });
});
