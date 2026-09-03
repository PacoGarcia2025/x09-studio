import { collectLibrarySrcs, sanitizeLibraryFilename } from "@/lib/assets/project-library-catalog";
import { LUXURY_PROPERTY_IMAGES } from "@/lib/pipeline/source-images";
import { optimizeUnsplashUrlsInSource } from "@/lib/publish/seo-meta";

/** Fotos mais próximas de games / tech quando o brief não é imobiliária. */
export const GAME_STOCK_IMAGES = [
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1538481199705-c7403e41dd88?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1200&fm=webp&q=80",
] as const;

export function stockImagesForBrief(brief?: string | null): readonly string[] {
  const t = brief?.toLowerCase() ?? "";
  if (
    /game|jogo|gamer|esport|console|xbox|playstation|steam|x09/i.test(t)
  ) {
    return GAME_STOCK_IMAGES;
  }
  return LUXURY_PROPERTY_IMAGES;
}

export function isImageFixMessage(message: string): boolean {
  return /(imagem|imagens|foto|fotos|logo|galeria|quebrada|n[aã]o (est[aã]o|t[aá]|aparec)|sumiu|sumiram|broken image)/i.test(
    message,
  );
}

export function isHeroWidenMessage(message: string): boolean {
  return /(hero|centraliz|mais (para os )?lados|mais larg|estender|estreit)/i.test(
    message,
  );
}

export function isDeterministicVisualMessage(message: string): boolean {
  return isImageFixMessage(message) || isHeroWidenMessage(message);
}

/** Hero copy preso em max-w-xl/2xl no centro — abre para os lados. */
export function widenHeroCopy(code: string): string {
  let out = code.replace(
    /\bmax-w-(?:sm|md|lg|xl|2xl|3xl)(\s+mx-auto)/g,
    "max-w-5xl$1",
  );
  out = out.replace(
    /\b(mx-auto\s+)max-w-(?:sm|md|lg|xl|2xl|3xl)\b/g,
    "$1max-w-5xl",
  );
  out = out.replace(
    /\bmax-w-(?:xl|2xl|3xl)(\s+text-center)/g,
    "max-w-5xl$1",
  );
  return out;
}

/**
 * Troca /library/foo.png por stock se o ficheiro não existir no disco.
 * Mantém paths cuja foto já está em public/library.
 */
export function rewriteMissingLibrarySrcs(
  code: string,
  existingFilenames: Set<string>,
  stock: readonly string[] = LUXURY_PROPERTY_IMAGES,
): string {
  let idx = 0;
  const nextUrl = () => stock[idx++ % stock.length]!;

  const out = code.replace(
    /(["'`])(\/library\/[A-Za-z0-9._-]+)\1/g,
    (full, quote: string, src: string) => {
      const name = sanitizeLibraryFilename(src.slice("/library/".length));
      if (name && existingFilenames.has(name)) return full;
      return `${quote}${nextUrl()}${quote}`;
    },
  );

  return optimizeUnsplashUrlsInSource(out);
}

export function libraryFilenamesInCode(code: string): string[] {
  return collectLibrarySrcs(code);
}
