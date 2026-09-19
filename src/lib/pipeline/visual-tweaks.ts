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

export const BURGER_FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1200&fm=webp&q=80",
] as const;

export const GENERAL_PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&fm=webp&q=80",
  "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=1200&fm=webp&q=80",
] as const;

export function stockImagesForBrief(brief?: string | null): readonly string[] {
  const t = brief?.toLowerCase() ?? "";
  if (/game|jogo|gamer|esport|console|xbox|playstation|steam|x09/i.test(t)) {
    return GAME_STOCK_IMAGES;
  }
  if (/burger|hamburguer|hamburgueria|cardapio|cardápio|lanche|restaurante|food|comida|gastronomia/i.test(t)) {
    return BURGER_FOOD_IMAGES;
  }
  if (/imovel|imóvel|imobiliaria|imobiliária|property|apartamento|casa|luxury|real estate/i.test(t)) {
    return LUXURY_PROPERTY_IMAGES;
  }
  return GENERAL_PRODUCT_IMAGES;
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

const SVG_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='%23e4e4e7'/%3E%3Ctext x='50%25' y='50%25' fill='%23a1a1aa' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='14'%3EAsset Pendente%3C/text%3E%3C/svg%3E";

export function rewriteMissingLibrarySrcs(
  code: string,
  existingFilenames: Set<string>,
  stock: readonly string[] = LUXURY_PROPERTY_IMAGES,
): string {
  // FASE 5: Preservar layout do Preview mas deixar óbvio que o asset não existe ou foi inventado
  // Usa placeholder estrutural ao invés de stock image genérica
  const out = code.replace(
    /(["'`])(\/library\/[A-Za-z0-9._-]+)\1/g,
    (full, quote: string, src: string) => {
      const name = sanitizeLibraryFilename(src.slice("/library/".length));
      if (!name) return full;
      if (MESH_EXT.test(name)) return full;
      if (!IMAGE_EXT.test(name)) return full;
      if (existingFilenames.has(name)) return full;
      return `${quote}${SVG_PLACEHOLDER}${quote}`;
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
