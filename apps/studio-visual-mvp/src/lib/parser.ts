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
 *
 * Fallbacks (GPT costuma omitir path=):
 * ```tsx /App.tsx
 * ```tsx:/App.tsx
 * ```/App.tsx
 * bloco tsx/jsx único → /App.tsx
 */
export function parseAIResponse(content: string): Record<string, string> {
  const files: Record<string, string> = {};
  const pending: Array<{ meta: string; code: string }> = [];

  const fenceRegex = /```([^\n`]*)\n([\s\S]*?)```/g;

  let match: RegExpExecArray | null;
  while ((match = fenceRegex.exec(content)) !== null) {
    const meta = match[1]?.trim() ?? "";
    const code = match[2] ?? "";
    pending.push({ meta, code });
  }

  const unresolved: Array<{ meta: string; code: string }> = [];

  for (const block of pending) {
    const path =
      extractPathFromMeta(block.meta) ?? extractPathFromFirstLine(block.code);

    if (!path) {
      unresolved.push(block);
      continue;
    }

    const cleaned = stripLeadingPathComment(block.code).replace(/\n$/, "");
    files[normalizePath(path)] = cleaned;
  }

  // Se a IA esqueceu path= e só mandou um bloco React, assume /App.tsx
  if (Object.keys(files).length === 0 && unresolved.length === 1) {
    const only = unresolved[0]!;
    if (looksLikeReactComponent(only.meta, only.code)) {
      files["/App.tsx"] = stripLeadingPathComment(only.code).replace(/\n$/, "");
    }
  } else if (Object.keys(files).length === 0) {
    const reactBlocks = unresolved.filter((block) =>
      looksLikeReactComponent(block.meta, block.code),
    );
    if (reactBlocks.length === 1) {
      const only = reactBlocks[0]!;
      files["/App.tsx"] = stripLeadingPathComment(only.code).replace(/\n$/, "");
    }
  }

  return files;
}

function extractPathFromMeta(meta: string): string | null {
  // path="/App.tsx" | path='/App.tsx' | path=/App.tsx
  const pathAttr =
    meta.match(/\bpath\s*=\s*(?:"([^"]+)"|'([^']+)'|(\S+))/i) ??
    meta.match(/\bfile\s*=\s*(?:"([^"]+)"|'([^']+)'|(\S+))/i);

  if (pathAttr) {
    return pathAttr[1] ?? pathAttr[2] ?? pathAttr[3] ?? null;
  }

  // ```tsx /App.tsx  |  ```tsx:/App.tsx  |  ```tsx App.tsx
  const langThenPath = meta.match(
    /^(?:tsx|ts|jsx|js|typescript|javascript|json|css|html|mdx?)\s*:?\s+(\/?[\w./-]+\.\w+)\s*$/i,
  );
  if (langThenPath?.[1]) return langThenPath[1];

  // ```/App.tsx  |  ```App.tsx
  const barePath = meta.match(/^\/?[\w./-]+\.\w+$/);
  if (barePath) return barePath[0];

  return null;
}

function extractPathFromFirstLine(code: string): string | null {
  // Fallback: // path: /App.tsx  ou  /* file: /App.tsx */
  const firstLine = code.split("\n", 1)[0] ?? "";
  const commentPath = firstLine.match(
    /^\s*(?:\/\/|\/\*|#)\s*(?:path|file)\s*[:=]\s*(\S+)/i,
  );
  if (commentPath?.[1]) {
    return commentPath[1].replace(/\*\/$/, "");
  }

  // // App.tsx  ou  // /components/Button.tsx
  const fileComment = firstLine.match(
    /^\s*(?:\/\/|\/\*)\s*(\/?[\w./-]+\.\w+)\s*(?:\*\/)?\s*$/,
  );
  return fileComment?.[1] ?? null;
}

function looksLikeReactComponent(meta: string, code: string): boolean {
  const lang = meta.split(/\s+/)[0]?.toLowerCase() ?? "";
  const isReactLang = /^(tsx|jsx|typescript|javascript|ts|js)?$/.test(lang);
  if (!isReactLang && lang.length > 0) return false;

  return (
    /export\s+default\s+function\b/.test(code) ||
    /export\s+default\s+\w+/.test(code) ||
    /function\s+App\s*\(/.test(code) ||
    /const\s+App\s*=/.test(code)
  );
}

function stripLeadingPathComment(code: string): string {
  const lines = code.split("\n");
  if (lines.length === 0) return code;

  const first = lines[0] ?? "";
  if (
    /^\s*(?:\/\/|\/\*|#)\s*(?:path|file)\s*[:=]/i.test(first) ||
    /^\s*(?:\/\/|\/\*)\s*\/?[\w./-]+\.\w+\s*(?:\*\/)?\s*$/.test(first)
  ) {
    return lines.slice(1).join("\n");
  }
  return code;
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
