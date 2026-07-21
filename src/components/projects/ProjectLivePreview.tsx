"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";
import { getProjectPreviewFiles } from "@/lib/projects/preview.actions";
import { ensureAppDefaultExport, sanitizeCodeForSandpack } from "@/lib/projects/preview-map";

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      html, body { margin: 0; padding: 0; min-height: 100%; height: 100%; }
      #root { min-height: 100%; }
      body { font-family: ui-sans-serif, system-ui, sans-serif; background: #fff; }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

function toSandpackFiles(raw: Record<string, string>): SandpackFiles {
  const mapped: SandpackFiles = {};

  for (const [path, code] of Object.entries(raw)) {
    const virtual = path.startsWith("/") ? path : `/${path}`;
    mapped[virtual] = {
      code:
        virtual === "/App.tsx" || virtual === "/App.jsx"
          ? ensureAppDefaultExport(sanitizeCodeForSandpack(code))
          : sanitizeCodeForSandpack(code),
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
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      setError(
        "O preview demorou demais. Clique em «Atualizar preview» ou aguarde a geração terminar.",
      );
      setLoading(false);
    }, 45_000);

    void (async () => {
      try {
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
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Falha ao carregar preview",
        );
        setLoading(false);
      } finally {
        window.clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [projectId, refreshKey, loadAttempt]);

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
        <div>
          <p>{error ?? "Preview indisponível"}</p>
          <button
            type="button"
            onClick={() => setLoadAttempt((n) => n + 1)}
            className="mt-3 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-white">
      <SandpackProvider
        key={`${projectId}-${refreshKey}`}
        template="react-ts"
        theme="light"
        files={sandpackFiles}
        style={{ height: "100%", width: "100%" }}
        customSetup={{
          dependencies: {
            "@supabase/supabase-js": "^2.50.2",
            "lucide-react": "^0.468.0",
            "framer-motion": "^11.15.0",
            leaflet: "^1.9.4",
            "leaflet.markercluster": "^1.5.3",
          },
        }}
        options={{
          recompileMode: "immediate",
          recompileDelay: 300,
          externalResources: [
            "https://cdn.tailwindcss.com",
            "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
            "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
            "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css",
          ],
          classes: {
            "sp-wrapper": "x09-sp-fill",
            "sp-layout": "x09-sp-fill",
            "sp-stack": "x09-sp-fill",
          },
        }}
      >
        <div className="sandpack-preview-host h-full w-full">
          <SandpackLayout style={{ height: "100%", border: "none" }}>
            <SandpackPreview
              showNavigator={false}
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
              showOpenNewtab={false}
              style={{ height: "100%", flex: 1 }}
            />
          </SandpackLayout>
        </div>
      </SandpackProvider>
    </div>
  );
}
