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
