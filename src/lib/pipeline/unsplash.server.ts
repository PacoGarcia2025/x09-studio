import "server-only";

const cache = new Map<string, string[]>();

const STOPWORDS = new Set([
  "crie", "criar", "crio", "faça", "faca", "fazer", "quero", "gostaria", "preciso",
  "um", "uma", "uns", "umas", "o", "a", "os", "as", "de", "da", "do", "das", "dos",
  "para", "pra", "com", "sem", "e", "ou", "meu", "minha", "meus", "minhas", "nosso",
  "nossa", "site", "app", "aplicativo", "sistema", "landing", "page", "projeto",
  "empresa", "negocio", "negócio", "loja", "sobre", "que", "seja", "tenha",
]);

/** Extrai uma query curta e relevante do brief (nome do negócio + segmento). */
export function extractImageQuery(brief: string): string {
  const firstLine = brief.split("\n")[0] ?? "";
  const words = firstLine
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return words.slice(0, 4).join(" ");
}

type UnsplashPhoto = { urls?: { regular?: string } };

/** Busca real de fotos na Unsplash (grátis, precisa de UNSPLASH_ACCESS_KEY). Sem chave, retorna []. */
export async function searchUnsplashImages(
  brief: string,
  count = 6,
): Promise<string[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return [];

  const query = extractImageQuery(brief);
  if (!query) return [];

  const cacheKey = `${query}::${count}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(count));
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high");

    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { results?: UnsplashPhoto[] };
    const urls = (data.results ?? [])
      .map((r) => r.urls?.regular)
      .filter((u): u is string => Boolean(u))
      .map((u) => `${u}${u.includes("?") ? "&" : "?"}fm=webp&q=80`);

    if (urls.length > 0) cache.set(cacheKey, urls);
    return urls;
  } catch {
    return [];
  }
}
