import fs from "node:fs/promises";
import path from "node:path";
import type { FileTreeNode } from "@/lib/projects/file-tree";
import {
  fileExists,
  listProjectTree,
  projectDirExists,
  readProjectFile,
  resolveInsideProject,
} from "@/lib/projects/fs.server";
import { getProjectDir } from "@/lib/projects/paths";
import { runVerifyCommand } from "@/lib/pipeline/verify-run.server";
import type {
  VerifyCategoryId,
  VerifyIssue,
  VerifyToolTrace,
} from "@/lib/pipeline/verify-schema";

export type CheckOutcome = {
  status: "success" | "warning" | "failed";
  summary: string;
  issues: VerifyIssue[];
  traces: VerifyToolTrace[];
};

function issue(
  partial: Omit<VerifyIssue, "id"> & { id?: string },
): VerifyIssue {
  const id =
    partial.id ??
    `${partial.category}:${partial.code}:${partial.file ?? "_"}:${partial.line ?? 0}:${hashSoft(partial.message)}`;
  return { ...partial, id };
}

function hashSoft(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 8);
}

function flattenFiles(nodes: FileTreeNode[], acc: string[] = []): string[] {
  for (const n of nodes) {
    if (n.type === "file") acc.push(n.path);
    if (n.children) flattenFiles(n.children, acc);
  }
  return acc;
}

const REQUIRED_STRUCTURE = [
  "package.json",
  "index.html",
  "vite.config.ts",
  "tsconfig.json",
  "src/main.tsx",
  "src/App.tsx",
];

/** Parse errors tsc / vite do output. */
function parseTsLikeErrors(
  category: VerifyCategoryId,
  output: string,
  source: VerifyIssue["source"],
): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const re =
    /(?:^|\n)([^\s:][^:\n]*?\.(?:tsx?|jsx?|mts|cts)):(\d+):(\d+)\s*-\s*error\s+(TS\d+):\s*(.+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(output)) !== null) {
    const file = m[1]!.replace(/\\/g, "/");
    const line = Number(m[2]);
    const column = Number(m[3]);
    const code = m[4]!;
    const message = m[5]!.trim();
    issues.push(
      issue({
        category,
        severity: "error",
        code,
        message,
        file,
        line,
        column,
        suggestion: `Corrigir ${code} em ${file}:${line}.`,
        confidence: 0.95,
        source,
        fixTarget: {
          kind: "edit_file",
          path: file,
          detail: `${code}: ${message}`,
        },
      }),
    );
  }

  // Vite / generic "Could not resolve"
  const viteRe =
    /(?:Could not resolve|Failed to resolve import)\s+["']([^"']+)["'](?:\s+from\s+["']([^"']+)["'])?/gi;
  let vm: RegExpExecArray | null;
  while ((vm = viteRe.exec(output)) !== null) {
    const target = vm[1]!;
    const from = vm[2] ?? null;
    issues.push(
      issue({
        category,
        severity: "error",
        code: "VITE_RESOLVE",
        message: `Não foi possível resolver import "${target}"${from ? ` em ${from}` : ""}`,
        file: from,
        suggestion: `Verificar se o arquivo/módulo "${target}" existe ou está declarado em package.json.`,
        confidence: 0.9,
        source: "tool",
        fixTarget: {
          kind: from ? "edit_file" : "install_package",
          path: from ?? undefined,
          packageName: target.startsWith(".") ? undefined : target,
          detail: `resolve ${target}`,
        },
      }),
    );
  }

  return issues;
}

function parseEslintOutput(output: string): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  // filepath
  //   line:col  error  message  rule
  const fileBlocks = output.split(/\n(?=\S)/);
  for (const block of fileBlocks) {
    const lines = block.split("\n");
    const fileLine = lines[0]?.trim();
    if (!fileLine || !/\.(tsx?|jsx?|mts|cts)$/.test(fileLine)) continue;
    const file = fileLine.replace(/\\/g, "/");
    for (const line of lines.slice(1)) {
      const m = line.match(
        /^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+([a-z0-9/@-]+)\s*$/i,
      );
      if (!m) continue;
      const severity = m[3]!.toLowerCase() === "error" ? "error" : "warning";
      issues.push(
        issue({
          category: "lint",
          severity,
          code: m[5]!,
          message: m[4]!.trim(),
          file,
          line: Number(m[1]),
          column: Number(m[2]),
          suggestion: `Ajustar lint (${m[5]}) em ${file}:${m[1]}.`,
          confidence: 0.92,
          source: "linter",
          fixTarget: {
            kind: "edit_file",
            path: file,
            detail: `${m[5]}: ${m[4]!.trim()}`,
          },
        }),
      );
    }
  }
  return issues;
}

async function readJsonPackage(
  projectId: string,
): Promise<{ ok: true; pkg: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    const raw = await readProjectFile(projectId, "package.json");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    return { ok: true, pkg };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "package.json inválido",
    };
  }
}

async function checkStructure(projectId: string): Promise<CheckOutcome> {
  const issues: VerifyIssue[] = [];
  const traces: VerifyToolTrace[] = [];

  if (!(await projectDirExists(projectId))) {
    return {
      status: "failed",
      summary: "Diretório do projeto não existe em disco",
      issues: [
        issue({
          category: "structure",
          severity: "error",
          code: "PROJECT_DIR_MISSING",
          message: "Projeto não encontrado no FileSystem",
          suggestion: "Execute o scaffold/Builder antes do Verify.",
          confidence: 1,
          source: "static",
          fixTarget: { kind: "unknown", detail: "scaffold missing" },
        }),
      ],
      traces,
    };
  }

  for (const rel of REQUIRED_STRUCTURE) {
    if (!(await fileExists(projectId, rel))) {
      issues.push(
        issue({
          category: "structure",
          severity: "error",
          code: "MISSING_FILE",
          message: `Arquivo obrigatório ausente: ${rel}`,
          file: rel,
          suggestion: `Criar ${rel} conforme o template React/Supabase.`,
          confidence: 1,
          source: "static",
          fixTarget: { kind: "create_file", path: rel },
        }),
      );
    }
  }

  const pkgResult = await readJsonPackage(projectId);
  if (!pkgResult.ok) {
    issues.push(
      issue({
        category: "structure",
        severity: "error",
        code: "PACKAGE_JSON_INVALID",
        message: pkgResult.error,
        file: "package.json",
        suggestion: "Corrigir JSON/sintaxe do package.json.",
        confidence: 1,
        source: "static",
        fixTarget: { kind: "edit_file", path: "package.json" },
      }),
    );
  } else {
    const scripts = (pkgResult.pkg.scripts ?? {}) as Record<string, string>;
    for (const need of ["build", "typecheck"] as const) {
      if (!scripts[need]) {
        issues.push(
          issue({
            category: "structure",
            severity: "warning",
            code: "MISSING_SCRIPT",
            message: `package.json sem script "${need}"`,
            file: "package.json",
            suggestion: `Adicionar scripts.${need} no package.json.`,
            confidence: 0.95,
            source: "static",
            fixTarget: {
              kind: "edit_file",
              path: "package.json",
              detail: `add scripts.${need}`,
            },
          }),
        );
      }
    }
  }

  // Imports relativos quebrados (arquivos inexistentes)
  const tree = await listProjectTree(projectId);
  const files = flattenFiles(tree).filter((f) =>
    /\.(tsx?|jsx?|mts|cts)$/.test(f),
  );
  const fileSet = new Set(files.map((f) => f.replace(/\\/g, "/")));

  for (const file of files) {
    let content: string;
    try {
      content = await readProjectFile(projectId, file);
    } catch {
      continue;
    }
    const importRe =
      /(?:from\s+|import\s*\()\s*["'](\.[^"']+)["']/g;
    let im: RegExpExecArray | null;
    while ((im = importRe.exec(content)) !== null) {
      const spec = im[1]!;
      if (spec.includes("?")) continue;
      const resolved = resolveRelativeImport(file, spec, fileSet);
      if (!resolved) {
        issues.push(
          issue({
            category: "structure",
            severity: "error",
            code: "BROKEN_IMPORT",
            message: `Import quebrado: "${spec}" em ${file}`,
            file,
            suggestion: `Criar o arquivo referenciado ou corrigir o caminho do import.`,
            confidence: 0.93,
            source: "static",
            fixTarget: {
              kind: "edit_file",
              path: file,
              detail: `broken import ${spec}`,
            },
          }),
        );
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  return {
    status: errors ? "failed" : warnings ? "warning" : "success",
    summary: errors
      ? `${errors} erro(s) de estrutura/imports`
      : warnings
        ? `${warnings} aviso(s) de estrutura`
        : "Estrutura e imports OK",
    issues,
    traces,
  };
}

function resolveRelativeImport(
  fromFile: string,
  spec: string,
  fileSet: Set<string>,
): boolean {
  const dir = path.posix.dirname(fromFile.replace(/\\/g, "/"));
  const base = path.posix.normalize(path.posix.join(dir, spec));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mts`,
    `${base}.cts`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
  ];
  return candidates.some((c) => fileSet.has(c));
}

async function checkEnv(projectId: string): Promise<CheckOutcome> {
  const issues: VerifyIssue[] = [];
  const hasExample = await fileExists(projectId, ".env.example");
  const hasEnv = await fileExists(projectId, ".env");

  if (!hasExample) {
    issues.push(
      issue({
        category: "env",
        severity: "warning",
        code: "ENV_EXAMPLE_MISSING",
        message: ".env.example ausente",
        file: ".env.example",
        suggestion: "Adicionar .env.example com as chaves necessárias.",
        confidence: 0.9,
        source: "static",
        fixTarget: { kind: "create_file", path: ".env.example" },
      }),
    );
  }

  let expectedKeys: string[] = [];
  if (hasExample) {
    const example = await readProjectFile(projectId, ".env.example");
    expectedKeys = example
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => l.split("=")[0]!.trim());
  }

  if (!hasEnv) {
    issues.push(
      issue({
        category: "env",
        severity: "warning",
        code: "ENV_MISSING",
        message: ".env ausente (app pode falhar em runtime)",
        file: ".env",
        suggestion: "Criar .env a partir de .env.example com valores válidos.",
        confidence: 0.88,
        source: "static",
        fixTarget: {
          kind: "set_env",
          detail: "create .env from example",
        },
      }),
    );
  } else if (expectedKeys.length) {
    const env = await readProjectFile(projectId, ".env");
    const present = new Set(
      env
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => l.split("=")[0]!.trim()),
    );
    for (const key of expectedKeys) {
      if (!present.has(key)) {
        issues.push(
          issue({
            category: "env",
            severity: "warning",
            code: "ENV_KEY_MISSING",
            message: `Chave ausente no .env: ${key}`,
            file: ".env",
            suggestion: `Definir ${key} no .env.`,
            confidence: 0.9,
            source: "static",
            fixTarget: { kind: "set_env", envKey: key },
          }),
        );
      } else {
        const line = env
          .split(/\r?\n/)
          .find((l) => l.startsWith(`${key}=`));
        const value = line?.slice(key.length + 1)?.trim() ?? "";
        if (!value) {
          issues.push(
            issue({
              category: "env",
              severity: "warning",
              code: "ENV_KEY_EMPTY",
              message: `Chave ${key} vazia no .env`,
              file: ".env",
              suggestion: `Preencher valor de ${key}.`,
              confidence: 0.85,
              source: "static",
              fixTarget: { kind: "set_env", envKey: key },
            }),
          );
        }
      }
    }
  }

  const warnings = issues.length;
  return {
    status: warnings ? "warning" : "success",
    summary: warnings
      ? `${warnings} aviso(s) de variáveis de ambiente`
      : "Env OK",
    issues,
    traces: [],
  };
}

async function checkDependencies(projectId: string): Promise<CheckOutcome> {
  const issues: VerifyIssue[] = [];
  const traces: VerifyToolTrace[] = [];
  const pkgResult = await readJsonPackage(projectId);
  if (!pkgResult.ok) {
    return {
      status: "failed",
      summary: "package.json inválido",
      issues: [
        issue({
          category: "dependencies",
          severity: "error",
          code: "PACKAGE_JSON_INVALID",
          message: pkgResult.error,
          file: "package.json",
          suggestion: "Corrigir package.json antes de instalar dependências.",
          confidence: 1,
          source: "static",
          fixTarget: { kind: "edit_file", path: "package.json" },
        }),
      ],
      traces,
    };
  }

  const deps = {
    ...(pkgResult.pkg.dependencies as Record<string, string> | undefined),
    ...(pkgResult.pkg.devDependencies as Record<string, string> | undefined),
  };

  for (const [name, version] of Object.entries(deps)) {
    if (!version || typeof version !== "string") {
      issues.push(
        issue({
          category: "dependencies",
          severity: "error",
          code: "DEP_VERSION_INVALID",
          message: `Dependência inválida: ${name}`,
          file: "package.json",
          suggestion: `Declarar versão válida para ${name}.`,
          confidence: 0.95,
          source: "static",
          fixTarget: {
            kind: "edit_file",
            path: "package.json",
            packageName: name,
          },
        }),
      );
    }
  }

  const nmPath = path.join(getProjectDir(projectId), "node_modules");
  let hasNodeModules = false;
  try {
    const st = await fs.stat(nmPath);
    hasNodeModules = st.isDirectory();
  } catch {
    hasNodeModules = false;
  }

  if (!hasNodeModules) {
    const result = await runVerifyCommand(projectId, "npm install", 240_000);
    traces.push({
      category: "dependencies",
      command: result.command,
      exitCode: result.exitCode,
      output: result.output,
      durationMs: result.durationMs,
    });
    if (result.exitCode !== 0) {
      issues.push(
        issue({
          category: "dependencies",
          severity: "error",
          code: "NPM_INSTALL_FAILED",
          message: "npm install falhou",
          suggestion: "Revisar package.json e locks; ver output do npm install.",
          confidence: 0.95,
          source: "tool",
          fixTarget: {
            kind: "run_command",
            detail: "npm install",
          },
        }),
      );
      return {
        status: "failed",
        summary: "Falha ao instalar dependências",
        issues,
        traces,
      };
    }
  }

  // Confirma pacotes críticos do template
  for (const critical of ["react", "react-dom", "vite", "typescript"]) {
    if (!(critical in deps)) {
      issues.push(
        issue({
          category: "dependencies",
          severity: "warning",
          code: "MISSING_CRITICAL_DEP",
          message: `Dependência esperada ausente: ${critical}`,
          file: "package.json",
          suggestion: `Adicionar ${critical} ao package.json.`,
          confidence: 0.8,
          source: "static",
          fixTarget: {
            kind: "install_package",
            packageName: critical,
          },
        }),
      );
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  return {
    status: errors ? "failed" : warnings ? "warning" : "success",
    summary: errors
      ? "Problemas nas dependências"
      : warnings
        ? "Dependências com avisos"
        : hasNodeModules
          ? "Dependências OK (node_modules presente)"
          : "Dependências instaladas com sucesso",
    issues,
    traces,
  };
}

async function checkDatabase(projectId: string): Promise<CheckOutcome> {
  const issues: VerifyIssue[] = [];
  const migrationsDir = path.join(
    getProjectDir(projectId),
    "supabase",
    "migrations",
  );

  let entries: string[] = [];
  try {
    const list = await fs.readdir(migrationsDir);
    entries = list.filter((f) => f.endsWith(".sql")).sort();
  } catch {
    return {
      status: "warning",
      summary: "Sem pasta supabase/migrations (ok se o app não usa SQL ainda)",
      issues: [
        issue({
          category: "database",
          severity: "info",
          code: "NO_MIGRATIONS_DIR",
          message: "Diretório supabase/migrations ausente",
          suggestion:
            "Criar migrations em supabase/migrations se o plano incluir banco.",
          confidence: 0.7,
          source: "static",
          fixTarget: {
            kind: "sql_migration",
            detail: "mkdir supabase/migrations",
          },
        }),
      ],
      traces: [],
    };
  }

  if (entries.length === 0) {
    return {
      status: "warning",
      summary: "Nenhuma migration SQL encontrada",
      issues: [
        issue({
          category: "database",
          severity: "warning",
          code: "NO_MIGRATIONS",
          message: "Pasta de migrations vazia",
          suggestion: "Gerar migrations SQL se houver tabelas no plano.",
          confidence: 0.75,
          source: "static",
          fixTarget: { kind: "sql_migration" },
        }),
      ],
      traces: [],
    };
  }

  for (const name of entries) {
    const rel = `supabase/migrations/${name}`;
    let sql: string;
    try {
      sql = await readProjectFile(projectId, rel);
    } catch {
      issues.push(
        issue({
          category: "database",
          severity: "error",
          code: "MIGRATION_UNREADABLE",
          message: `Não foi possível ler ${rel}`,
          file: rel,
          suggestion: "Recriar o arquivo de migration.",
          confidence: 0.95,
          source: "static",
          fixTarget: { kind: "edit_file", path: rel },
        }),
      );
      continue;
    }

    if (!sql.trim()) {
      issues.push(
        issue({
          category: "database",
          severity: "error",
          code: "MIGRATION_EMPTY",
          message: `Migration vazia: ${name}`,
          file: rel,
          suggestion: "Preencher SQL válido ou remover o arquivo.",
          confidence: 1,
          source: "static",
          fixTarget: { kind: "edit_file", path: rel },
        }),
      );
      continue;
    }

    const open = (sql.match(/\(/g) ?? []).length;
    const close = (sql.match(/\)/g) ?? []).length;
    if (open !== close) {
      issues.push(
        issue({
          category: "database",
          severity: "error",
          code: "SQL_UNBALANCED_PARENS",
          message: `Parênteses desbalanceados em ${name}`,
          file: rel,
          suggestion: "Corrigir sintaxe SQL (parênteses).",
          confidence: 0.85,
          source: "static",
          fixTarget: { kind: "edit_file", path: rel },
        }),
      );
    }

    if (
      !/\b(create|alter|drop|insert|update|delete|comment|grant|revoke|select)\b/i.test(
        sql,
      )
    ) {
      issues.push(
        issue({
          category: "database",
          severity: "warning",
          code: "SQL_NO_DDL_DML",
          message: `Migration sem instruções SQL reconhecíveis: ${name}`,
          file: rel,
          suggestion: "Confirmar se o arquivo contém DDL/DML válido.",
          confidence: 0.7,
          source: "static",
          fixTarget: { kind: "edit_file", path: rel },
        }),
      );
    }

    if (!/^\d{8,}/.test(name)) {
      issues.push(
        issue({
          category: "database",
          severity: "warning",
          code: "MIGRATION_NAME",
          message: `Nome de migration fora do padrão timestamp_: ${name}`,
          file: rel,
          suggestion: "Usar prefixo timestamp (ex.: 20260714120000_nome.sql).",
          confidence: 0.8,
          source: "static",
          fixTarget: { kind: "edit_file", path: rel },
        }),
      );
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  return {
    status: errors ? "failed" : warnings ? "warning" : "success",
    summary: errors
      ? `${errors} erro(s) em migrations`
      : warnings
        ? `${warnings} aviso(s) em migrations`
        : `${entries.length} migration(s) OK`,
    issues,
    traces: [],
  };
}

async function checkTypescript(projectId: string): Promise<CheckOutcome> {
  const pkg = await readJsonPackage(projectId);
  const scripts =
    pkg.ok && pkg.pkg.scripts
      ? (pkg.pkg.scripts as Record<string, string>)
      : {};
  if (!scripts.typecheck) {
    return {
      status: "warning",
      summary: 'Script "typecheck" ausente',
      issues: [
        issue({
          category: "typescript",
          severity: "warning",
          code: "NO_TYPECHECK_SCRIPT",
          message: "package.json sem npm run typecheck",
          file: "package.json",
          suggestion: 'Adicionar "typecheck": "tsc -b --noEmit".',
          confidence: 0.95,
          source: "static",
          fixTarget: {
            kind: "edit_file",
            path: "package.json",
            detail: "add typecheck script",
          },
        }),
      ],
      traces: [],
    };
  }

  const result = await runVerifyCommand(projectId, "npm run typecheck");
  const parsed = parseTsLikeErrors("typescript", result.output, "compiler");
  const issues =
    parsed.length > 0
      ? parsed
      : result.exitCode === 0
        ? []
        : [
            issue({
              category: "typescript",
              severity: "error",
              code: "TYPECHECK_FAILED",
              message: "typecheck falhou (ver output)",
              suggestion: "Corrigir erros TypeScript reportados pelo tsc.",
              confidence: 0.85,
              source: "compiler",
              fixTarget: { kind: "unknown", detail: result.output.slice(0, 500) },
            }),
          ];

  return {
    status: result.exitCode === 0 ? (issues.length ? "warning" : "success") : "failed",
    summary:
      result.exitCode === 0
        ? "TypeScript OK"
        : `${issues.length || 1} erro(s) TypeScript`,
    issues,
    traces: [
      {
        category: "typescript",
        command: result.command,
        exitCode: result.exitCode,
        output: result.output,
        durationMs: result.durationMs,
      },
    ],
  };
}

async function checkLint(projectId: string): Promise<CheckOutcome> {
  const pkg = await readJsonPackage(projectId);
  const scripts =
    pkg.ok && pkg.pkg.scripts
      ? (pkg.pkg.scripts as Record<string, string>)
      : {};

  if (!scripts.lint) {
    return {
      status: "warning",
      summary: 'Script "lint" ausente',
      issues: [
        issue({
          category: "lint",
          severity: "warning",
          code: "NO_LINT_SCRIPT",
          message: "package.json sem npm run lint",
          file: "package.json",
          suggestion: "Adicionar ESLint + script lint no projeto gerado.",
          confidence: 0.9,
          source: "static",
          fixTarget: {
            kind: "edit_file",
            path: "package.json",
            detail: "add lint script",
          },
        }),
      ],
      traces: [],
    };
  }

  const result = await runVerifyCommand(projectId, "npm run lint");
  const parsed = parseEslintOutput(result.output);
  const errors = parsed.filter((i) => i.severity === "error");
  const warnings = parsed.filter((i) => i.severity === "warning");

  let issues = parsed;
  if (result.exitCode !== 0 && parsed.length === 0) {
    issues = [
      issue({
        category: "lint",
        severity: "error",
        code: "LINT_FAILED",
        message: "lint falhou (ver output)",
        suggestion: "Corrigir problemas reportados pelo ESLint.",
        confidence: 0.85,
        source: "linter",
        fixTarget: { kind: "unknown", detail: result.output.slice(0, 500) },
      }),
    ];
  }

  const status =
    result.exitCode !== 0 || errors.length
      ? "failed"
      : warnings.length
        ? "warning"
        : "success";

  return {
    status,
    summary:
      status === "success"
        ? "Lint OK"
        : status === "warning"
          ? `${warnings.length} aviso(s) de lint`
          : `${errors.length || 1} erro(s) de lint`,
    issues,
    traces: [
      {
        category: "lint",
        command: result.command,
        exitCode: result.exitCode,
        output: result.output,
        durationMs: result.durationMs,
      },
    ],
  };
}

async function checkBuild(projectId: string): Promise<CheckOutcome> {
  const pkg = await readJsonPackage(projectId);
  const scripts =
    pkg.ok && pkg.pkg.scripts
      ? (pkg.pkg.scripts as Record<string, string>)
      : {};
  if (!scripts.build) {
    return {
      status: "failed",
      summary: 'Script "build" ausente',
      issues: [
        issue({
          category: "build",
          severity: "error",
          code: "NO_BUILD_SCRIPT",
          message: "package.json sem npm run build",
          file: "package.json",
          suggestion: 'Adicionar "build": "tsc -b && vite build".',
          confidence: 1,
          source: "static",
          fixTarget: {
            kind: "edit_file",
            path: "package.json",
            detail: "add build script",
          },
        }),
      ],
      traces: [],
    };
  }

  const result = await runVerifyCommand(projectId, "npm run build", 240_000);
  const parsed = [
    ...parseTsLikeErrors("build", result.output, "compiler"),
    ...parseTsLikeErrors("build", result.output, "tool"),
  ];
  // Dedup by id
  const byId = new Map(parsed.map((i) => [i.id, i]));
  let issues = [...byId.values()];

  if (result.exitCode !== 0 && issues.length === 0) {
    const viteHint = /vite/i.test(result.output);
    issues = [
      issue({
        category: "build",
        severity: "error",
        code: viteHint ? "VITE_BUILD_FAILED" : "BUILD_FAILED",
        message: viteHint
          ? "Build Vite falhou"
          : "npm run build falhou",
        suggestion: "Corrigir erros de compilação/Vite no output do build.",
        confidence: 0.88,
        source: "tool",
        fixTarget: { kind: "unknown", detail: result.output.slice(0, 500) },
      }),
    ];
  }

  return {
    status: result.exitCode === 0 ? "success" : "failed",
    summary:
      result.exitCode === 0
        ? "Build OK"
        : `${issues.length || 1} erro(s) de build`,
    issues,
    traces: [
      {
        category: "build",
        command: result.command,
        exitCode: result.exitCode,
        output: result.output,
        durationMs: result.durationMs,
      },
    ],
  };
}

export async function runVerifyCategory(
  projectId: string,
  category: VerifyCategoryId,
): Promise<CheckOutcome> {
  // Garante resolução segura do root (falha cedo se PROJECTS_ROOT inválido)
  resolveInsideProject(projectId, ".");

  switch (category) {
    case "structure":
      return checkStructure(projectId);
    case "env":
      return checkEnv(projectId);
    case "dependencies":
      return checkDependencies(projectId);
    case "database":
      return checkDatabase(projectId);
    case "typescript":
      return checkTypescript(projectId);
    case "lint":
      return checkLint(projectId);
    case "build":
      return checkBuild(projectId);
    default: {
      const _x: never = category;
      throw new Error(`Categoria Verify desconhecida: ${_x}`);
    }
  }
}
