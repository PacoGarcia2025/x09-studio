"use client";

import { useMemo } from "react";
import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      html, body { margin: 0; padding: 0; min-height: 100%; height: 100%; }
      #root { min-height: 100%; }
    </style>
  </head>
  <body><div id="root"></div></body>
</html>`;

function toSandpackFiles(raw: Record<string, string>): SandpackFiles {
  const mapped: SandpackFiles = {};
  for (const [path, code] of Object.entries(raw)) {
    const virtual = path.startsWith("/") ? path : `/${path}`;
    mapped[virtual] = { code };
  }
  if (!mapped["/App.tsx"] && !mapped["/App.jsx"]) {
    mapped["/App.tsx"] = {
      code: `export default function App(){return <div style={{padding:24}}>App</div>}`,
    };
  }
  return {
    ...mapped,
    "/public/index.html": { code: INDEX_HTML, hidden: true },
  };
}

export function PublicSitePreview({
  files,
  title,
}: {
  files: Record<string, string>;
  title: string;
}) {
  const sandpackFiles = useMemo(() => toSandpackFiles(files), [files]);

  return (
    <div className="fixed inset-0 bg-white">
      <div className="sandpack-preview-host h-full w-full">
        <SandpackProvider
          template="react-ts"
          theme="light"
          files={sandpackFiles}
          style={{ height: "100%", width: "100%" }}
          customSetup={{
            dependencies: {
              "@supabase/supabase-js": "^2.50.2",
              "lucide-react": "^0.468.0",
              "framer-motion": "^11.15.0",
            },
          }}
          options={{
            recompileMode: "immediate",
            externalResources: ["https://cdn.tailwindcss.com"],
            classes: {
              "sp-wrapper": "x09-sp-fill",
              "sp-layout": "x09-sp-fill",
              "sp-stack": "x09-sp-fill",
            },
          }}
        >
          <SandpackLayout style={{ height: "100%", border: "none" }}>
            <SandpackPreview
              showNavigator={false}
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
              showOpenNewtab={false}
              style={{ height: "100%", flex: 1 }}
            />
          </SandpackLayout>
        </SandpackProvider>
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
