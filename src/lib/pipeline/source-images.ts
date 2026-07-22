import { optimizeUnsplashUrlsInSource } from "@/lib/publish/seo-meta";

/** Fotos luxury imobiliárias (Unsplash, uso em preview/publish). */
export const LUXURY_PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1200&fm=webp&q=80",
] as const;

export function isBrokenImageSrc(src: string): boolean {
  const s = src.trim();
  if (!s) return true;
  if (/^data:/i.test(s)) return false;
  if (/^https?:\/\//i.test(s)) {
    if (/placeholder|example\.com|via\.placeholder|picsum\.photos\/seed\/\d/i.test(s)) {
      return true;
    }
    return false;
  }
  if (/^\/(?!\/)/.test(s)) return true;
  if (/^\.\.?\//.test(s)) return true;
  if (/^im[oó]vel[\s_-]*\d/i.test(s)) return true;
  if (/^\/imagem|^\/img|^\/images?\//i.test(s)) return true;
  if (/placeholder|no-?image|broken|example\.jpg/i.test(s)) return true;
  return true;
}

export function hasBrokenImageSources(code: string): boolean {
  const srcPattern = /(?:src=\{?"([^"'`]+)"\}?|images:\s*\[[^\]]*"([^"]+)")/g;
  let match: RegExpExecArray | null;
  while ((match = srcPattern.exec(code)) !== null) {
    const src = match[1] ?? match[2] ?? "";
    if (src && isBrokenImageSrc(src)) return true;
  }
  return false;
}

/**
 * Substitui src locais/placeholder por URLs Unsplash reais e otimiza CDN.
 */
export function fixBrokenImagesInSource(code: string): string {
  let idx = 0;
  const nextUrl = () =>
    LUXURY_PROPERTY_IMAGES[idx++ % LUXURY_PROPERTY_IMAGES.length]!;

  let out = code.replace(
    /src=\{?"([^"'`]+)"\}?/g,
    (match, src: string) => {
      if (!isBrokenImageSrc(src)) return match;
      const url = nextUrl();
      return match.startsWith("src={") ? `src="${url}"` : `src="${url}"`;
    },
  );

  out = out.replace(/images:\s*\[([^\]]*)\]/g, (match, inner: string) => {
    const fixed = inner.replace(/"([^"]+)"/g, (quoted, val: string) => {
      if (!isBrokenImageSrc(val)) return quoted;
      return `"${nextUrl()}"`;
    });
    return `images: [${fixed}]`;
  });

  return optimizeUnsplashUrlsInSource(out);
}

export function isScaffoldPlaceholderHome(content: string): boolean {
  return /Gerando seu app|Em instantes esta página será substituída/i.test(content);
}
