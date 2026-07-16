import type { SandpackFiles } from "@codesandbox/sandpack-react";

const virtualIndexHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <title>X09 Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const virtualMain = `import React from "react";
import { createRoot } from "react-dom/client";
import App from "../App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

export function toSandpackFiles(files: Record<string, string>): SandpackFiles {
  const mappedFiles = Object.fromEntries(
    Object.entries(files).map(([path, code]) => [path, { code }]),
  ) as SandpackFiles;

  return {
    ...mappedFiles,
    "/index.html": { code: virtualIndexHtml },
    "/src/main.tsx": { code: virtualMain },
  };
}
