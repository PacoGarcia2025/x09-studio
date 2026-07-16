import type { SandpackFiles } from "@codesandbox/sandpack-react";

/**
 * Template `react-ts` do Sandpack lê `/public/index.html` (não `/index.html`).
 * O bundler injeta o bundle; não precisa de <script type="module"> manual.
 */
const virtualIndexHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              background: '#06030d',
              surface: '#10091f',
              foreground: '#f7f3ff',
              muted: '#a9a0b8',
              accent: '#7a3cff',
              border: 'rgba(255, 255, 255, 0.12)',
            },
          },
        },
      };
    </script>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        background-color: #06030d;
        color: #f7f3ff;
      }
      #root {
        min-height: 100%;
      }
    </style>
  </head>
  <body class="m-0 p-0 bg-background text-foreground">
    <div id="root" class="min-h-screen flex flex-col"></div>
  </body>
</html>
`;

/** Arquivos que o template Sandpack já gerencia — sobrescrever quebra o bundler. */
const SANDBOX_SKIP = new Set([
  "/package.json",
  "/package-lock.json",
  "/tsconfig.json",
  "/index.html",
  "/public/index.html",
  "/styles.css",
  "/index.tsx",
  "/index.js",
]);

export function toSandpackFiles(files: Record<string, string>): SandpackFiles {
  const mappedFiles: SandpackFiles = {};

  for (const [rawPath, code] of Object.entries(files)) {
    const path = normalizeVirtualPath(rawPath);
    if (SANDBOX_SKIP.has(path)) continue;

    mappedFiles[path] = {
      code: path === "/App.tsx" || path === "/App.jsx" ? ensureAppDefaultExport(code) : code,
    };
  }

  // Garante entrypoint válido mesmo se a IA não gerou App.tsx
  if (!mappedFiles["/App.tsx"] && !mappedFiles["/App.jsx"]) {
    mappedFiles["/App.tsx"] = {
      code: `export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="text-xl">Aguardando geração...</p>
    </div>
  );
}
`,
    };
  }

  return {
    ...withMissingImportStubs(mappedFiles),
    "/public/index.html": { code: virtualIndexHtml },
  };
}

function normalizeVirtualPath(path: string): string {
  const trimmed = path.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Corrige padrões comuns da IA que quebram o Sandpack:
 * - `function App() {}` sem export default
 */
function ensureAppDefaultExport(code: string): string {
  if (/export\s+default\b/.test(code)) return code;

  if (/function\s+App\s*\(/.test(code) || /const\s+App\s*=/.test(code)) {
    return `${code.trimEnd()}\n\nexport default App;\n`;
  }

  return code;
}

/**
 * Enquanto a IA ainda não emitiu todos os arquivos, imports relativos
 * quebram o preview com "Element type is invalid ... undefined".
 * Criamos stubs `export default` para paths ainda ausentes.
 */
function withMissingImportStubs(files: SandpackFiles): SandpackFiles {
  const result: SandpackFiles = { ...files };
  const existing = new Set(Object.keys(result));

  const importRegex =
    /import\s+(\w+)\s+from\s+['"](\.\.?\/[^'"]+)['"]/g;

  for (const file of Object.values(files)) {
    const code = typeof file === "string" ? file : file.code;
    importRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(code)) !== null) {
      const importName = match[1]!;
      const resolved = resolveRelativeImport(match[2]!);
      if (existing.has(resolved)) continue;
      if ([...existing].some((path) => path.startsWith(resolved.replace(/\.tsx$/, "")))) {
        continue;
      }

      result[resolved] = {
        code: `export default function ${importName}() {\n  return null;\n}\n`,
      };
      existing.add(resolved);
    }
  }

  return result;
}

function resolveRelativeImport(specifier: string): string {
  let path = specifier.replace(/^\.\//, "/");
  if (path.startsWith("../")) {
    path = `/${path.replace(/^(\.\.\/)+/, "")}`;
  }
  if (!/\.\w+$/.test(path)) {
    path = `${path}.tsx`;
  }
  return path.startsWith("/") ? path : `/${path}`;
}
