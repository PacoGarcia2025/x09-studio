/**
 * Cloudflare Worker — SEO dinâmico na borda (plano Free).
 * Rota: *.studio.x09.com.br/*
 *
 * Env vars (Dashboard → Workers → Settings):
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 * - ORIGIN_URL (ex: https://studio.x09.com.br)
 */

const CRAWLER_RE =
  /googlebot|bingbot|facebookexternalhit|whatsapp|telegrambot|twitterbot|linkedinbot|slackbot|discordbot/i;

export default {
  async fetch(request, env) {
    const ua = request.headers.get("user-agent") ?? "";
    const url = new URL(request.url);
    const hostParts = url.hostname.split(".");
    const slug = hostParts[0];

    if (!CRAWLER_RE.test(ua) || slug === "studio" || slug === "www") {
      return fetch(request);
    }

    const seo = await fetchSeo(env, slug, url.pathname);
    if (!seo) return fetch(request);

    const html = buildHtml(seo, url.href);
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  },
};

async function fetchSeo(env, slug, path) {
  const base = env.SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_ANON_KEY;
  if (!base || !key) return null;

  const q = new URL(`${base}/rest/v1/published_seo_pages`);
  q.searchParams.set("project_slug", `eq.${slug}`);
  q.searchParams.set("path", `eq.${path || "/"}`);
  q.searchParams.set("select", "title,description,og_image,price_brl,json_ld");

  const res = await fetch(q.href, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] ?? null;
}

function buildHtml(seo, url) {
  const image =
    seo.og_image ??
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&fm=webp&q=80";
  const price =
    seo.price_brl != null
      ? ` — ${Number(seo.price_brl).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
      : "";

  return `<!doctype html><html lang="pt-BR"><head>
<meta charset="UTF-8"/>
<title>${esc(seo.title)}${price}</title>
<meta name="description" content="${esc(seo.description)}"/>
<meta property="og:title" content="${esc(seo.title)}"/>
<meta property="og:description" content="${esc(seo.description)}"/>
<meta property="og:image" content="${esc(image)}"/>
<meta property="og:url" content="${esc(url)}"/>
${seo.json_ld ? `<script type="application/ld+json">${JSON.stringify(seo.json_ld)}</script>` : ""}
</head><body></body></html>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}
