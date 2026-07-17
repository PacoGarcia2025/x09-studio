import { useEffect, useRef } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";
import { useStudioStore } from "@/store/studio-store";
import type { RepairIssue } from "@/lib/api";

/**
 * Captura erros de compilação/runtime do Sandpack e grava no store
 * para o loop de auto-repair.
 */
export function SandpackErrorBridge() {
  const { sandpack } = useSandpack();
  const setPreviewError = useStudioStore((s) => s.setPreviewError);
  const requestRepair = useStudioStore((s) => s.requestRepair);
  const lastFingerprint = useRef<string | null>(null);

  useEffect(() => {
    const error = sandpack.error;
    if (!error) {
      setPreviewError(null);
      return;
    }

    const issue: RepairIssue = {
      id: `sandpack-${hash(error.message)}`,
      category: /import|resolve|module/i.test(error.message)
        ? "import"
        : /type|tsx?|syntax/i.test(error.message)
          ? "compile"
          : "runtime",
      severity: "error",
      message: error.message,
      file: extractFile(error.message),
      line: extractLine(error.message),
      suggestion: "Corrigir o erro reportado pelo Preview Sandpack.",
    };

    const fingerprint = `${issue.file ?? ""}:${issue.message}`;
    setPreviewError(issue);

    if (fingerprint !== lastFingerprint.current) {
      lastFingerprint.current = fingerprint;
      void requestRepair([issue]);
    }
  }, [sandpack.error, setPreviewError, requestRepair]);

  return null;
}

function extractFile(message: string): string | undefined {
  const m = message.match(/(\/[\w./-]+\.(?:tsx?|jsx?))/);
  return m?.[1];
}

function extractLine(message: string): number | undefined {
  const m = message.match(/:(\d+)(?::\d+)?/);
  return m ? Number(m[1]) : undefined;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 8);
}
