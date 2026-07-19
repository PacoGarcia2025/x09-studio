"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";
import { getProjectPreviewFiles } from "@/lib/projects/preview.actions";

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      html, body, #root { margin: 0; padding: 0; min-height: 100%; }
      body { font-family: ui-sans-serif, system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

function sanitizeCode(code: string): string {
  return code
    .replace(/^\s*import\s+['"]tailwindcss(?:\/[^'"]*)?['"]\s*;?\s*$/gm, "")
    .replace(
      /^\s*import\s+['"]\.\/(?:index|styles|globals|app)\.css['"]\s*;?\s*$/gm,
      "",
    )
    .replace(/\n{3,}/g, "\n\n");
}

function ensureAppDefaultExport(code: string): string {
  if (/export\s+default\b/.test(code)) return code;
  if (/function\s+App\s*\(/.test(code) || /const\s+App\s*=/.test(code)) {
    return `${code.trimEnd()}\n\nexport default App;\n`;
  }
  return code;
}

function toSandpackFiles(raw: Record<string, string>): SandpackFiles {
  const mapped: SandpackFiles = {};

  for (const [path, code] of Object.entries(raw)) {
    const virtual = path.startsWith("/") ? path : `/${path}`;
    mapped[virtual] = {
      code:
        virtual === "/App.tsx" || virtual === "/App.jsx"
          ? ensureAppDefaultExport(sanitizeCode(code))
          : sanitizeCode(code),
    };
  }

  if (!mapped["/App.tsx"] && !mapped["/App.jsx"]) {
    mapped["/App.tsx"] = {
      code: `export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Aguardando geração…</h1>
      <p>O preview atualiza quando o Builder terminar.</p>
    </div>
  );
}
`,
    };
  }

  return {
    ...mapped,
    "/public/index.html": { code: INDEX_HTML, hidden: true },
  };
}

type Props = {
  projectId: string;
  refreshKey?: number;
};

export function ProjectLivePreview({ projectId, refreshKey = 0 }: Props) {
  const [files, setFiles] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const result = await getProjectPreviewFiles(projectId);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setFiles(null);
        setLoading(false);
        return;
      }
      setFiles(result.files);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);

  const sandpackFiles = useMemo(
    () => (files ? toSandpackFiles(files) : null),
    [files],
  );

  if (loading) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-white text-sm text-zinc-500">
        Carregando preview…
      </div>
    );
  }

  if (error || !sandpackFiles) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-white px-6 text-center text-sm text-zinc-500">
        {error ?? "Preview indisponível"}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-white [&_.sp-wrapper]:h-full [&_.sp-layout]:h-full [&_.sp-preview-container]:h-full">
      <SandpackProvider
        key={`${projectId}-${refreshKey}`}
        template="react-ts"
        theme="light"
        files={sandpackFiles}
        customSetup={{
          dependencies: {
            "@supabase/supabase-js": "^2.50.2",
            "lucide-react": "^0.468.0",
            "framer-motion": "^11.15.0",
          },
        }}
        options={{
          recompileMode: "immediate",
          recompileDelay: 300,
          externalResources: ["https://cdn.tailwindcss.com"],
        }}
      >
        <SandpackLayout style={{ height: "100%", border: "none" }}>
          <SandpackPreview
            showNavigator={false}
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            style={{ height: "100%" }}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
