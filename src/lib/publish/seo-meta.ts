/** Gera meta tags HTML para index.html no publish. */
import { injectPublishHeadAssets } from "@/lib/publish/publish-assets";
export type PublishSeoInput = {
  siteName: string;
  description: string;
  url: string;
  ogImage?: string;
  themeColor?: string;
};

export function buildPublishIndexHtml(input: PublishSeoInput): string {
  const desc = escapeHtml(input.description.slice(0, 160));
  const title = escapeHtml(input.siteName.slice(0, 60));
  const url = escapeHtml(input.url);
  const ogImage =
    input.ogImage ??
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&fm=webp&q=80";
  const theme = input.themeColor ?? "#D4AF37";

  return injectPublishHeadAssets(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <meta name="theme-color" content="${theme}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
    <link rel="preconnect" href="https://images.unsplash.com" crossorigin />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);
}

export function buildRobotsTxt(siteUrl: string): string {
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl.replace(/\/$/, "")}/sitemap.xml
`;
}

export function buildSitemapXml(
  siteUrl: string,
  paths: string[] = ["/", "/imoveis", "/login"],
): string {
  const base = siteUrl.replace(/\/$/, "");
  const urls = paths
    .map(
      (p) => `  <url>
    <loc>${escapeHtml(`${base}${p}`)}</loc>
    <changefreq>weekly</changefreq>
    <priority>${p === "/" ? "1.0" : "0.8"}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/** JSON-LD RealEstateListing a partir de dados mock no código. */
export function extractListingsJsonLd(
  propertiesTs: string,
  siteName: string,
  siteUrl: string,
): string | null {
  const listings: Array<Record<string, unknown>> = [];
  const blockRe =
    /\{\s*id:\s*["']([^"']+)["'][\s\S]*?title:\s*["']([^"']+)["'][\s\S]*?price:\s*(\d+)/g;

  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(propertiesTs)) && listings.length < 12) {
    listings.push({
      "@type": "RealEstateListing",
      name: m[2],
      url: `${siteUrl.replace(/\/$/, "")}/imovel/${m[1]}`,
      offers: {
        "@type": "Offer",
        price: Number(m[3]),
        priceCurrency: "BRL",
      },
    });
  }

  if (listings.length === 0) return null;

  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "RealEstateAgent",
          name: siteName,
          url: siteUrl,
        },
        ...listings,
      ],
    },
    null,
    2,
  );
}

/** Otimiza URLs Unsplash para WebP (sem sharp — parâmetro CDN gratuito). */
export function optimizeUnsplashUrlsInSource(code: string): string {
  return code.replace(
    /https:\/\/images\.unsplash\.com\/photo-[^"'`\s)]+/g,
    (url) => {
      if (/[?&]fm=webp/.test(url)) return url;
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}fm=webp&q=80`;
    },
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isCrawlerUserAgent(ua: string | null): boolean {
  if (!ua) return false;
  return /googlebot|bingbot|facebookexternalhit|whatsapp|telegrambot|twitterbot|linkedinbot|slackbot|discordbot/i.test(
    ua,
  );
}

export type CrawlerSeoPayload = {
  title: string;
  description: string;
  og_image?: string | null;
  price_brl?: number | null;
  json_ld?: unknown | null;
};

export function buildCrawlerHtml(
  seo: CrawlerSeoPayload,
  originUrl: string,
): string {
  const image =
    seo.og_image ??
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&fm=webp&q=80";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(seo.title)}</title>
  <meta name="description" content="${escapeHtml(seo.description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(seo.title)}" />
  <meta property="og:description" content="${escapeHtml(seo.description)}" />
  <meta property="og:url" content="${escapeHtml(originUrl)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta name="twitter:card" content="summary_large_image" />
  ${seo.json_ld ? `<script type="application/ld+json">${JSON.stringify(seo.json_ld)}</script>` : ""}
  <meta http-equiv="refresh" content="0;url=${escapeHtml(originUrl)}" />
</head>
<body><p>Redirecionando…</p></body>
</html>`;
}

export function inferDescriptionFromBrief(
  brief: string | null | undefined,
  projectName: string,
): string {
  const text = brief?.trim();
  if (text && text.length > 40) {
    return text.replace(/\s+/g, " ").slice(0, 155);
  }
  return `${projectName} — imóveis de alto padrão, catálogo exclusivo e atendimento premium.`;
}
