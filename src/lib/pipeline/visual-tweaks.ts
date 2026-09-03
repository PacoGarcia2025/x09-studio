import { collectLibrarySrcs, sanitizeLibraryFilename } from "@/lib/assets/project-library-catalog";
import { LUXURY_PROPERTY_IMAGES } from "@/lib/pipeline/source-images";
import { stripForbiddenPreviewImports } from "@/lib/projects/preview-map";
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

export function isGlbHeroMessage(message: string): boolean {
  const hasGlb = /\bglb\b|\bgltf\b/i.test(message);
  if (!hasGlb) return false;
  if (
    /(hero|tela|ocup|fundo|full|destaque|coloca|coloque|usar|use|mostrar|exibir|landing|p[aá]gina|site)/i.test(
      message,
    )
  ) {
    return true;
  }
  return /(tenho|galeria).{0,48}(glb|gltf)|(glb|gltf).{0,48}(galeria|tenho)/i.test(
    message,
  );
}

export function isDeterministicVisualMessage(message: string): boolean {
  return (
    isGlbHeroMessage(message) ||
    isImageFixMessage(message) ||
    isHeroWidenMessage(message)
  );
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;
const MESH_EXT = /\.(glb|gltf)$/i;

export const HERO_GLB_COMPONENT = `import { useEffect } from "react";

const SCRIPT_SRC =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";

export function HeroGlb({ src }: { src: string }) {
  useEffect(() => {
    if (typeof customElements !== "undefined" && customElements.get("model-viewer")) {
      return;
    }
    if (document.querySelector("script[data-x09-model-viewer]")) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = SCRIPT_SRC;
    script.dataset.x09ModelViewer = "1";
    document.head.appendChild(script);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen"
      aria-hidden
    >
      {/* @ts-expect-error web component */}
      <model-viewer
        src={src}
        auto-rotate
        rotation-per-second="22deg"
        shadow-intensity="1"
        shadow-softness="0.7"
        exposure="1.05"
        environment-image="neutral"
        interaction-prompt="none"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          background: "transparent",
        }}
      />
    </div>
  );
}
`;

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
 * Troca /library/foto.png por stock só se o ficheiro não existir.
 * Nunca substitui GLB/GLTF — esses não são fotos.
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
      if (!name) return full;
      if (MESH_EXT.test(name)) return full;
      if (!IMAGE_EXT.test(name)) return full;
      if (existingFilenames.has(name)) return full;
      return `${quote}${nextUrl()}${quote}`;
    },
  );

  return optimizeUnsplashUrlsInSource(out);
}

export function injectFullscreenHeroGlb(
  code: string,
  glbSrc: string,
  importFromPages = true,
): string {
  let out = stripForbiddenPreviewImports(code.replace(/\r\n/g, "\n"));
  out = out.replace(/<model-viewer\b[\s\S]*?<\/model-viewer>/gi, "");
  const importLine = importFromPages
    ? `import { HeroGlb } from "../components/HeroGlb";`
    : `import { HeroGlb } from "./components/HeroGlb";`;
  if (!out.includes("components/HeroGlb")) {
    const imports = out.match(/^(?:import[\s\S]*?;\n)+/);
    out = imports
      ? `${imports[0]}${importLine}\n${out.slice(imports[0].length)}`
      : `${importLine}\n${out}`;
  }

  if (/<HeroGlb\b/.test(out)) {
    return out.replace(
      /<HeroGlb\b[^>]*\/?>/,
      `<HeroGlb src="${glbSrc}" />`,
    );
  }

  if (/return\s*\(/.test(out)) {
    out = out.replace(
      /return\s*\(\s*/,
      `return (\n    <>\n      <HeroGlb src="${glbSrc}" />\n      <div className="relative z-10 [&>*:first-child]:!bg-transparent">\n      `,
    );
  } else if (/return\s+</.test(out)) {
    out = out.replace(
      /return\s+</,
      `return (\n    <>\n      <HeroGlb src="${glbSrc}" />\n      <div className="relative z-10 [&>*:first-child]:!bg-transparent">\n      <`,
    );
  } else {
    return out;
  }

  const close = out.lastIndexOf(");");
  if (close >= 0) {
    out = `${out.slice(0, close)}</div>\n    </>\n  );${out.slice(close + 2)}`;
  }
  return out;
}

export function libraryFilenamesInCode(code: string): string[] {
  return collectLibrarySrcs(code);
}
