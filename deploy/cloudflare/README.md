# Cloudflare Worker — SEO dinâmico (Free tier)

Intercepta **crawlers** (Google, WhatsApp, Telegram, etc.) em `*.studio.x09.com.br` e injeta OG tags a partir da tabela `published_seo_pages` (Supabase).

## Deploy (zero custo)

1. Cloudflare Dashboard → **Workers & Pages** → Create Worker
2. Cole o conteúdo de `seo-worker.mjs`
3. **Settings → Variables:**
   - `SUPABASE_URL` = URL do projeto Supabase
   - `SUPABASE_ANON_KEY` = anon key (leitura pública RLS)
4. **Triggers → Routes:** `*.studio.x09.com.br/*`
5. DNS: proxy laranja (Cloudflare) no wildcard `*.studio.x09.com.br`

## Fallback sem Cloudflare

O Next.js já expõe `generateMetadata` em `/sites/[slug]/[[...path]]` e responde crawlers na origem (VPS).

## Publish

Ao publicar no Studio, `syncPublishedSeoPages` popula `/`, `/imoveis` e `/imovel/{id}` automaticamente.
