import "server-only";
import {
  fileExists,
  readProjectFile,
} from "@/lib/projects/fs.server";

const CANDIDATES = [
  "dist/index.html",
  "src/pages/HomePage.tsx",
  "src/pages/HomePage.jsx",
  "src/pages/Index.tsx",
  "src/pages/Home.tsx",
  "src/components/Hero.tsx",
  "src/components/Hero.jsx",
  "src/components/landing/Hero.tsx",
  "src/App.tsx",
  "src/App.jsx",
  "index.html",
] as const;

function extractImportedLocalFiles(source: string, fromFile: string): string[] {
  const dir = fromFile.includes("/")
    ? fromFile.slice(0, fromFile.lastIndexOf("/") + 1)
    : "";
  const paths: string[] = [];
  const re =
    /import\s+(?:\{[^}]*\}|[\w*]+)\s+from\s+["'](\.[^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const rel = match[1];
    if (!rel.startsWith(".")) continue;
    // resolve relative to current file
    const joined = resolveRelative(dir, rel);
    for (const ext of ["", ".tsx", ".jsx", ".ts", ".js"]) {
      paths.push(`${joined}${ext}`);
    }
  }
  return paths;
}

function resolveRelative(dir: string, rel: string): string {
  const parts = `${dir}${rel}`.replace(/\\/g, "/").split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

/**
 * Monta um HTML estático da hero do projeto a partir dos arquivos gerados.
 * Preferência: dist/index.html → páginas/componentes TSX (e imports locais) → fallback.
 */
export async function buildProjectCardPreviewHtml(
  projectId: string,
  projectName: string,
): Promise<string> {
  const tried = new Set<string>();

  for (const relativePath of CANDIDATES) {
    if (tried.has(relativePath)) continue;
    tried.add(relativePath);
    if (!(await fileExists(projectId, relativePath))) continue;

    try {
      const raw = await readProjectFile(projectId, relativePath);
      if (relativePath.endsWith(".html")) {
        return wrapHtmlDocument(injectBase(raw), projectName);
      }

      // Tenta o arquivo + imports locais (HomePage → Hero, etc.)
      const queue: string[] = [relativePath];
      const chunks: string[] = [];
      for (let i = 0; i < queue.length && chunks.length < 4; i++) {
        const file = queue[i];
        if (!(await fileExists(projectId, file))) continue;
        const content =
          file === relativePath ? raw : await readProjectFile(projectId, file);
        const html = tsxToStaticHtml(content);
        if (html && html.length > 60) chunks.push(html);
        for (const imported of extractImportedLocalFiles(content, file)) {
          const base = imported.replace(/\.(tsx|jsx|ts|js)$/, "");
          for (const candidate of [
            imported,
            `${base}.tsx`,
            `${base}.jsx`,
            `${base}/index.tsx`,
          ]) {
            if (!tried.has(candidate) && (await fileExists(projectId, candidate))) {
              tried.add(candidate);
              queue.push(candidate);
            }
          }
        }
      }

      // Prefer o chunk mais longo (geralmente a home/hero)
      chunks.sort((a, b) => b.length - a.length);
      if (chunks[0]) {
        return wrapHtmlDocument(chunks[0], projectName);
      }
    } catch {
      // tenta próximo candidato
    }
  }

  return wrapHtmlDocument(fallbackHero(projectName), projectName);
}

function injectBase(html: string): string {
  if (/<base\s/i.test(html)) return html;
  return html.replace(
    /<head([^>]*)>/i,
    `<head$1><base href="./"><meta name="viewport" content="width=device-width, initial-scale=1">`,
  );
}

function wrapHtmlDocument(bodyOrFull: string, title: string): string {
  const isFull = /<html[\s>]/i.test(bodyOrFull);
  if (isFull) {
    return bodyOrFull.replace(
      /<\/head>/i,
      `<style>html,body{margin:0;padding:0;overflow:hidden;background:#fff}body{transform-origin:top left}</style></head>`,
    );
  }

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; background: #fff; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; }
  </style>
</head>
<body>
${bodyOrFull}
</body>
</html>`;
}

/**
 * Conversão conservadora de JSX/TSX → HTML estático para thumbnail.
 * Remove lógica React e mantém markup + classes Tailwind.
 */
export function tsxToStaticHtml(source: string): string | null {
  let jsx = extractMainJsx(source);
  if (!jsx) return null;

  jsx = jsx
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/className=/g, "class=")
    .replace(/htmlFor=/g, "for=")
    .replace(/\s+on[A-Z][a-zA-Z]*=\{[^}]*\}/g, "")
    .replace(/\s+(aria-[a-z-]+)=\{([^}]*)\}/g, "")
    .replace(/\{`([^`]*)`\}/g, "$1")
    .replace(/\{'([^']*)'\}/g, "$1")
    .replace(/\{"([^"]*)"\}/g, "$1")
    .replace(/\{[^{}]*\?[\s\S]*?:[\s\S]*?\}/g, "")
    .replace(/\{[^{}]+\}/g, "")
    .replace(/<>/g, "<div>")
    .replace(/<\/>/g, "</div>")
    .replace(/\s+/g, " ")
    .trim();

  // Remove tags de componentes customizados deixando children quando possível
  jsx = jsx.replace(
    /<([A-Z][A-Za-z0-9.]*)([^>]*)\/>/g,
    "",
  );
  jsx = jsx.replace(
    /<([A-Z][A-Za-z0-9.]*)([^>]*)>([\s\S]*?)<\/\1>/g,
    "$3",
  );

  if (!jsx.includes("<")) return null;
  return jsx;
}

function extractMainJsx(source: string): string | null {
  // return ( ... );
  const paren = source.match(/return\s*\(\s*([\s\S]*?)\s*\);/);
  if (paren?.[1] && paren[1].includes("<")) {
    return truncateToRoot(paren[1].trim());
  }

  // return <...>;
  const direct = source.match(/return\s+(<[A-Za-z][\s\S]*?);/);
  if (direct?.[1]) return truncateToRoot(direct[1].trim());

  // export default function ... { ... return (
  const anyJsx = source.match(/<[a-z][\s\S]{40,}/);
  if (anyJsx) return truncateToRoot(anyJsx[0].slice(0, 12000));

  return null;
}

function truncateToRoot(jsx: string): string {
  // Limita tamanho para card (hero)
  if (jsx.length > 14000) return jsx.slice(0, 14000);
  return jsx;
}

function fallbackHero(name: string): string {
  const safe = escapeHtml(name);
  return `<section class="min-h-[420px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-600 text-white">
  <div class="mx-auto flex max-w-3xl flex-col items-center px-8 py-16 text-center">
    <p class="mb-4 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">Studio X09</p>
    <h1 class="text-4xl font-bold tracking-tight">${safe}</h1>
    <p class="mt-4 text-sm text-white/80">Preview do projeto</p>
    <button class="mt-8 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900">Começar</button>
  </div>
</section>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
