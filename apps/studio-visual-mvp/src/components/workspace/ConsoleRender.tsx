import { SandpackConsole, SandpackLayout } from "@codesandbox/sandpack-react";

export function ConsoleRender() {
  return (
    <div className="h-full min-h-0 bg-background p-4">
      <SandpackLayout className="!h-full !overflow-hidden !rounded-2xl !border !border-border">
        <SandpackConsole
          className="!h-full !w-full"
          showHeader
          showResetConsoleButton
          resetOnPreviewRestart={false}
        />
      </SandpackLayout>
    </div>
  );
}
