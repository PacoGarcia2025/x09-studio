const TEXT_EXT =
  /\.(tsx?|jsx?|css|json|html|md|svg|txt|mjs|cjs)$/i;

const SKIP_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "tsconfig.node.json",
  "vite.config.ts",
  "eslint.config.js",
  "README.md",
]);

/** Sandpack usa template react-ts (CRA), não Vite — import.meta quebra o parse. */
export function sanitizeCodeForSandpack(code: string): string {
  return code
    .replace(/^\s*import\s+['"]tailwindcss(?:\/[^'"]*)?['"]\s*;?\s*$/gm, "")
    .replace(
      /^\s*import\s+['"]\.\/(?:index|styles|globals|app)\.css['"]\s*;?\s*$/gm,
      "",
    )
    .replace(/import\.meta\.env\.([A-Z0-9_]+)/g, '""')
    .replace(/import\.meta\.env\[['"]([^'"]+)['"]\]/g, '""')
    .replace(/\n{3,}/g, "\n\n");
}

export function ensureAppDefaultExport(code: string): string {
  if (/export\s+default\b/.test(code)) return code;
  if (/function\s+App\s*\(/.test(code) || /const\s+App\s*=/.test(code)) {
    return `${code.trimEnd()}\n\nexport default App;\n`;
  }
  return code;
}

export function prepareSandpackFileContent(
  virtualPath: string,
  code: string,
): string {
  let next = sanitizeCodeForSandpack(code);
  if (virtualPath === "/App.tsx" || virtualPath === "/App.jsx") {
    next = ensureAppDefaultExport(next);
  }
  return next;
}

export function parseDotEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function patchSupabaseEnvInCode(
  code: string,
  env: Record<string, string>,
): string {
  let next = sanitizeCodeForSandpack(code);
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_ANON_KEY?.trim();
  if (url) {
    next = next.replace(
      /const url(?:\s*:\s*[^=]+)?\s*=\s*[^;]+;/,
      `const url: string | undefined = ${JSON.stringify(url)};`,
    );
  }
  if (key) {
    next = next.replace(
      /const anonKey(?:\s*:\s*[^=]+)?\s*=\s*[^;]+;/,
      `const anonKey: string | undefined = ${JSON.stringify(key)};`,
    );
  }
  return next;
}

/** Mapeia arquivos do disco (Vite src/*) para paths virtuais do Sandpack. */
export function toSandpackVirtualPath(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const base = normalized.split("/").pop() ?? "";
  if (SKIP_FILES.has(base)) return null;
  if (!TEXT_EXT.test(normalized)) return null;

  if (
    normalized === "src/main.tsx" ||
    normalized === "src/main.jsx" ||
    normalized === "index.html" ||
    normalized === "src/vite-env.d.ts"
  ) {
    return null;
  }

  if (normalized.startsWith("src/")) {
    return `/${normalized.slice(4)}`;
  }

  if (normalized === "package.json") return null;

  return `/${normalized}`;
}
