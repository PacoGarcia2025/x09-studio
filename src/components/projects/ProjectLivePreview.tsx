"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";
import {
  sandpackCustomSetup,
  sandpackExternalResources,
} from "@/lib/projects/sandpack-setup";
import { getProjectPreviewFiles } from "@/lib/projects/preview.actions";
import { ensureAppDefaultExport, sanitizeCodeForSandpack } from "@/lib/projects/preview-map";
import {
  isPlaceholderPreviewContent,
  PreviewBuildingScreen,
} from "@/components/projects/PreviewBuildingScreen";

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>
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
  isBuilding?: boolean;
  /** Miniatura nos cards — landing real, sem o overlay técnico do pipeline. */
  variant?: "workspace" | "card";
};

export function ProjectLivePreview({
  projectId,
  refreshKey = 0,
  isBuilding = false,
  variant = "workspace",
}: Props) {
  const isCard = variant === "card";
  const [files, setFiles] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const hasLoadedOnceRef = useRef(false);
  const isBuildingRef = useRef(isBuilding);
  isBuildingRef.current = isBuilding;

  useEffect(() => {
    let cancelled = false;
    const firstLoad = !hasLoadedOnceRef.current;
    if (firstLoad) {
      setLoading(true);
      setError(null);
    }

    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(false);
      if (hasLoadedOnceRef.current) return;
      setError(
        "O preview demorou demais. Clique em «Tentar de novo» ou aguarde a geração terminar.",
      );
    }, firstLoad ? 90_000 : 60_000);

    void (async () => {
      try {
        const result = await getProjectPreviewFiles(projectId);
        if (cancelled) return;
        if (!result.ok) {
          if (result.generating && isBuildingRef.current) {
            setLoading(false);
            return;
          }
          if (hasLoadedOnceRef.current) {
            setLoading(false);
            return;
          }
          setError(result.error);
          setFiles(null);
          setLoading(false);
          return;
        }
        setFiles(result.files);
        setError(null);
        setLoading(false);
        hasLoadedOnceRef.current = true;
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        if (hasLoadedOnceRef.current) return;
        setError(
          err instanceof Error ? err.message : "Falha ao carregar preview",
        );
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

  const isPlaceholder =
    files != null && isPlaceholderPreviewContent(files);
  const hasRealPreview = files != null && !isPlaceholder;

  if (isCard && !hasRealPreview) {
    return <CardLandingSkeleton />;
  }

  const showBuildingOverlay =
    isBuilding &&
    !hasRealPreview &&
    (files == null ? loading || !hasLoadedOnceRef.current : isPlaceholder);

  if (showBuildingOverlay && !error) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-[#08060f]">
        <PreviewBuildingScreen
          title={
            isBuilding || loading
              ? "Construindo seu showcase…"
              : "Gerando seu app…"
          }
          subtitle={
            isBuilding || loading
              ? "Agentes de IA planejando, codando e verificando cada detalhe."
              : "Em instantes esta página será substituída pelo conteúdo do seu produto."
          }
        />
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
        key={projectId}
        template="react-ts"
        theme="light"
        files={sandpackFiles}
        style={{ height: "100%", width: "100%" }}
        customSetup={sandpackCustomSetup}
        options={{
          recompileMode: "immediate",
          recompileDelay: 300,
          externalResources: sandpackExternalResources,
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

function CardLandingSkeleton() {
  return (
    <div className="absolute inset-0 bg-zinc-100">
      <div className="absolute inset-x-0 top-0 h-12 bg-white" />
      <div className="absolute inset-x-10 top-24 h-8 rounded-lg bg-zinc-200/80" />
      <div className="absolute inset-x-16 top-36 h-4 rounded bg-zinc-200/60" />
      <div className="absolute inset-x-8 bottom-8 top-48 rounded-2xl bg-white shadow-sm" />
    </div>
  );
}
