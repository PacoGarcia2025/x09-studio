/**
 * Extrai arquivos de uma resposta Markdown da IA.
 *
 * Formatos aceitos:
 * ```tsx path="/App.tsx"
 * ...código...
 * ```
 *
 * ```path="/src/components/Button.tsx"
 * ...código...
 * ```
 *
 * ```ts file="/package.json"
 * ...código...
 * ```
 */
export function parseAIResponse(content: string): Record<string, string> {
  const files: Record<string, string> = {};

  // Blocos fenced: ```lang path="..." | ```path="..." | ```lang file="..."
  const fenceRegex =
    /```([^\n`]*)\n([\s\S]*?)```/g;

  let match: RegExpExecArray | null;
  while ((match = fenceRegex.exec(content)) !== null) {
    const meta = match[1]?.trim() ?? "";
    const code = match[2] ?? "";

    const path =
      extractPathFromMeta(meta) ??
      extractPathFromFirstLine(code);

    if (!path) continue;

    const cleaned = stripLeadingPathComment(code).replace(/\n$/, "");
    files[normalizePath(path)] = cleaned;
  }

  return files;
}

function extractPathFromMeta(meta: string): string | null {
  // path="/App.tsx" | path='/App.tsx' | path=/App.tsx
  const pathAttr =
    meta.match(/\bpath\s*=\s*(?:"([^"]+)"|'([^']+)'|(\S+))/i) ??
    meta.match(/\bfile\s*=\s*(?:"([^"]+)"|'([^']+)'|(\S+))/i);

  if (!pathAttr) return null;
  return pathAttr[1] ?? pathAttr[2] ?? pathAttr[3] ?? null;
}

function extractPathFromFirstLine(code: string): string | null {
  // Fallback: // path: /App.tsx  ou  /* file: /App.tsx */
  const firstLine = code.split("\n", 1)[0] ?? "";
  const commentPath =
    firstLine.match(/^\s*(?:\/\/|\/\*|#)\s*(?:path|file)\s*[:=]\s*(\S+)/i);
  return commentPath?.[1]?.replace(/\*\/$/, "") ?? null;
}

function stripLeadingPathComment(code: string): string {
  const lines = code.split("\n");
  if (lines.length === 0) return code;

  const first = lines[0] ?? "";
  if (/^\s*(?:\/\/|\/\*|#)\s*(?:path|file)\s*[:=]/i.test(first)) {
    return lines.slice(1).join("\n");
  }
  return code;
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
