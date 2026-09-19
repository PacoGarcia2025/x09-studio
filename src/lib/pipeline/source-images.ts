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

const NON_IMAGE_SRC =
  /\.(js|jsx|ts|tsx|mjs|cjs|css|woff2?|map)(\?|#|$)/i;

export function isBrokenImageSrc(src: string): boolean {
  const s = src.trim();
  if (!s) return true;
  if (/^data:/i.test(s)) return false;
  if (NON_IMAGE_SRC.test(s)) return false;
  if (/^\/assets\//i.test(s)) return false;
  if (/^\/library\//i.test(s)) return false;
  if (/^\/src\//i.test(s)) return false;
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

const SVG_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='%23e4e4e7'/%3E%3Ctext x='50%25' y='50%25' fill='%23a1a1aa' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='14'%3EAsset Pendente%3C/text%3E%3C/svg%3E";

export function fixBrokenImagesInSource(
  code: string,
  brief?: string | null,
  realStock?: readonly string[],
): string {
  // FASE 5: Em vez de mascarar com Unsplash, usamos um placeholder SVG neutro 
  // para preservar layout sem gerar erro visual de ícone quebrado.
  let out = code.replace(
    /<img\b([^>]*?)\ssrc=(["'])([^"']+)\2([^>]*)>/gi,
    (match, before, quote, src, after) => {
      if (!isBrokenImageSrc(src)) return match;
      return `<img${before} src=${quote}${SVG_PLACEHOLDER}${quote}${after}>`;
    },
  );

  out = out.replace(
    /<img\b([^>]*?)\ssrc=\{?"([^"'`]+)"\}?([^>]*)>/gi,
    (match, before, src, after) => {
      if (!isBrokenImageSrc(src)) return match;
      return `<img${before} src="${SVG_PLACEHOLDER}"${after}>`;
    },
  );

  out = out.replace(/images:\s*\[([^\]]*)\]/g, (match, inner: string) => {
    const fixed = inner.replace(/"([^"]+)"/g, (quoted, val: string) => {
      if (!isBrokenImageSrc(val)) return quoted;
      return `"${SVG_PLACEHOLDER}"`;
    });
    return `images: [${fixed}]`;
  });

  return optimizeUnsplashUrlsInSource(out);
}

export function isScaffoldPlaceholderHome(content: string): boolean {
  return /Gerando seu app|Em instantes esta página será substituída/i.test(content);
}
