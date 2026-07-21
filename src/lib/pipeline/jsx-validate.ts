import ts from "typescript";

const TSX_EXT = /\.tsx$/i;

export function isTsxPath(path: string): boolean {
  return TSX_EXT.test(path.replace(/\\/g, "/"));
}

/** Erros de sintaxe TSX (truncamento, tags abertas, etc.). */
export function getTsxSyntaxIssues(
  content: string,
  fileName = "file.tsx",
): string[] {
  const trimmed = content.trim();
  if (!trimmed) return ["Arquivo vazio"];

  const dangling = detectDanglingJsx(trimmed);
  if (dangling.length > 0) return dangling;

  const result = ts.transpileModule(trimmed, {
    fileName,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      allowJs: true,
    },
    reportDiagnostics: true,
  });

  const diagnostics = result.diagnostics ?? [];
  if (diagnostics.length === 0) return [];

  return diagnostics.slice(0, 4).map((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, " ");
    const line =
      d.file && d.start != null
        ? d.file.getLineAndCharacterOfPosition(d.start).line + 1
        : null;
    return line ? `Linha ${line}: ${msg}` : msg;
  });
}

export function hasValidTsxSyntax(content: string, fileName?: string): boolean {
  return getTsxSyntaxIssues(content, fileName).length === 0;
}

/** Heurísticas rápidas antes do parser TS. */
function detectDanglingJsx(content: string): string[] {
  const issues: string[] = [];
  const lines = content.split(/\r?\n/);
  const lastLine = (lines.at(-1) ?? "").trim();

  if (/^<[A-Za-z][A-Za-z0-9.-]*(?:\s|$)/.test(lastLine) && !/>/.test(lastLine)) {
    issues.push(
      `Arquivo termina com tag JSX incompleta: "${lastLine.slice(0, 40)}"`,
    );
  }

  if (/^["'`][^"'`]*$/.test(lastLine)) {
    issues.push("Arquivo termina no meio de uma string");
  }

  const balance = balanceDelimiters(content);
  if (balance.braces !== 0) {
    issues.push(
      balance.braces > 0
        ? "Chaves `{` `}` desbalanceadas (faltam fechamentos)"
        : "Chaves `{` `}` desbalanceadas (fechamentos a mais)",
    );
  }
  if (balance.parens !== 0) {
    issues.push("Parênteses `(` `)` desbalanceados");
  }

  return issues;
}

function balanceDelimiters(source: string): { braces: number; parens: number } {
  let braces = 0;
  let parens = 0;
  let inString: "'" | '"' | "`" | null = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inString = ch;
      continue;
    }

    if (ch === "{") braces += 1;
    else if (ch === "}") braces -= 1;
    else if (ch === "(") parens += 1;
    else if (ch === ")") parens -= 1;
  }

  return { braces, parens };
}
