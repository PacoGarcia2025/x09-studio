import { describe, expect, it } from "vitest";
import {
  buildCrawlerHtml,
  buildPublishIndexHtml,
  buildRobotsTxt,
  buildSitemapXml,
  extractListingsJsonLd,
  isCrawlerUserAgent,
  optimizeUnsplashUrlsInSource,
} from "@/lib/publish/seo-meta";

describe("publish seo-meta", () => {
  it("builds index.html with OG tags", () => {
    const html = buildPublishIndexHtml({
      siteName: "SGO Imóveis",
      description: "Portal imobiliário premium em São Paulo.",
      url: "https://sgo.studio.x09.com.br",
    });
    expect(html).toMatch(/og:title/);
    expect(html).toMatch(/SGO Imóveis/);
    expect(html).toMatch(/canonical/);
  });

  it("builds sitemap and robots", () => {
    const url = "https://demo.studio.x09.com.br";
    expect(buildRobotsTxt(url)).toMatch(/sitemap.xml/i);
    expect(buildSitemapXml(url, ["/", "/imoveis"])).toMatch(/<loc>/);
  });

  it("extracts RealEstateListing JSON-LD from properties.ts", () => {
    const src = `export const MOCK_PROPERTIES = [{ id: "1", title: "Cobertura", price: 5000000 }]`;
    const json = extractListingsJsonLd(src, "SGO", "https://sgo.example.com");
    expect(json).toMatch(/RealEstateListing/);
    expect(json).toMatch(/5000000/);
  });

  it("adds webp params to unsplash urls", () => {
    const out = optimizeUnsplashUrlsInSource(
      'const u = "https://images.unsplash.com/photo-123?w=800";',
    );
    expect(out).toMatch(/fm=webp/);
  });

  it("detects WhatsApp crawler", () => {
    expect(isCrawlerUserAgent("WhatsApp/2.0")).toBe(true);
    expect(isCrawlerUserAgent("Mozilla/5.0 Chrome")).toBe(false);
  });

  it("builds crawler HTML with OG tags", () => {
    const html = buildCrawlerHtml(
      {
        title: "Cobertura Jardins",
        description: "Imóvel exclusivo",
        og_image: "https://example.com/img.webp",
        json_ld: { "@type": "RealEstateListing" },
      },
      "https://demo.studio.x09.com.br/imovel/1",
    );
    expect(html).toMatch(/og:title/);
    expect(html).toMatch(/RealEstateListing/);
  });
});
