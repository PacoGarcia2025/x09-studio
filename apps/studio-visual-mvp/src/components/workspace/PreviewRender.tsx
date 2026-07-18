import { SandpackLayout, SandpackPreview } from "@codesandbox/sandpack-react";

/** Re-export: deps do Sandpack (framer-motion, lucide, etc.) — usadas no SandpackProvider em App.tsx */
export { sandpackCustomSetup } from "./sandpack-setup";

export function PreviewRender() {
  return (
    <div className="sandpack-preview-host h-full w-full">
      <SandpackLayout style={{ height: "100%", border: "none" }}>
        <SandpackPreview
          showNavigator={false}
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
          style={{ height: "100%" }}
        />
      </SandpackLayout>
    </div>
  );
}
