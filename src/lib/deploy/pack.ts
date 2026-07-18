import { filterFilesForPush, normalizeRepoPath } from "@/lib/github/secrets-filter";

const MAX_FILES = 200;
const MAX_TOTAL_BYTES = 8_000_000;

const TEMPLATE_FILES: Record<string, string> = {
  "package.json": JSON.stringify(
    {
      name: "x09-published-app",
      private: true,
      version: "0.0.1",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        "lucide-react": "^0.468.0",
        recharts: "^2.15.0",
        "react-is": "^18.3.1",
      },
      devDependencies: {
        "@types/react": "^18.3.12",
        "@types/react-dom": "^18.3.1",
        "@vitejs/plugin-react": "^4.3.4",
        typescript: "^5.6.3",
        vite: "^5.4.11",
      },
    },
    null,
    2,
  ),
  "index.html": `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>X09 App</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`,
  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        isolatedModules: true,
        moduleDetection: "force",
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
      },
      include: ["src"],
    },
    null,
    2,
  ),
  "src/main.tsx": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,
  "src/index.css": `html, body, #root { margin: 0; min-height: 100%; }
body { font-family: Inter, system-ui, sans-serif; background: #05070c; color: #f8fafc; }
`,
  "vercel.json": JSON.stringify(
    {
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
    },
    null,
    2,
  ),
};

function mapStudioPathToSrc(path: string): string {
  const normalized = normalizeRepoPath(path);
  if (normalized === "App.tsx" || normalized === "src/App.tsx") {
    return "src/App.tsx";
  }
  if (normalized.startsWith("src/")) return normalized;
  if (
    normalized.endsWith(".tsx") ||
    normalized.endsWith(".ts") ||
    normalized.endsWith(".css")
  ) {
    return `src/${normalized}`;
  }
  return normalized;
}

export type PackedFile = { file: string; data: string; encoding: "utf-8" };

export function packVisualProjectForVercel(input: {
  name: string;
  files: Record<string, string> | null | undefined;
}): PackedFile[] {
  const filtered = filterFilesForPush(input.files ?? {});
  const merged: Record<string, string> = { ...TEMPLATE_FILES };

  for (const [path, content] of Object.entries(filtered)) {
    const target = mapStudioPathToSrc(path);
    if (target === "package.json") continue;
    merged[target] = content;
  }

  if (!merged["src/App.tsx"]) {
    const safeName = input.name.replace(/[`$\\]/g, "");
    merged["src/App.tsx"] = `export default function App() {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <h1 className="text-3xl font-semibold">${safeName}</h1>
    </main>
  );
}
`;
  }

  const entries = Object.entries(merged);
  if (entries.length > MAX_FILES) {
    throw new Error(`Projeto excede ${MAX_FILES} arquivos.`);
  }

  let total = 0;
  const packed: PackedFile[] = [];
  for (const [file, data] of entries) {
    total += Buffer.byteLength(data, "utf8");
    if (total > MAX_TOTAL_BYTES) {
      throw new Error("Projeto excede o limite de tamanho para deploy.");
    }
    packed.push({ file, data, encoding: "utf-8" });
  }
  return packed;
}
