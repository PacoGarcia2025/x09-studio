/**
 * Comandos que o Builder realmente executa no disco do projeto.
 * Build/typecheck NÃO rodam aqui: o preview usa Sandpack e o VPS
 * quase nunca tem node_modules do app gerado.
 */
const EXECUTABLE = new Set([
  "npm install",
  "npm ci",
  "bun install",
]);

/** Aceitos no plano/prompt, mas ignorados com log (não falham o build). */
const SKIPPED = new Set([
  "npm run build",
  "npm run typecheck",
  "npm run preview",
  "bun run build",
  "bun run typecheck",
]);

const KNOWN = new Set([...EXECUTABLE, ...SKIPPED]);

export function listAllowedCommands(): string[] {
  return [...KNOWN];
}

function normalizePiece(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

export type ResolvedCommands = {
  run: string[];
  skipped: string[];
  ignored: string[];
};

/**
 * Separa o que pode rodar, o que pula (build/typecheck) e o que descarta (migrate etc.).
 */
export function resolveCommandPlan(command: string): ResolvedCommands {
  const pieces = command
    .split(/&&|;/)
    .map(normalizePiece)
    .filter(Boolean);

  const run: string[] = [];
  const skipped: string[] = [];
  const ignored: string[] = [];

  for (const piece of pieces) {
    if (EXECUTABLE.has(piece)) run.push(piece);
    else if (SKIPPED.has(piece)) skipped.push(piece);
    else ignored.push(piece);
  }

  return { run, skipped, ignored };
}

/** @deprecated Prefer resolveCommandPlan — mantido para callers antigos. */
export function resolveAllowedCommands(command: string): string[] {
  return resolveCommandPlan(command).run;
}

export function assertAllowedCommand(command: string): string {
  const { run, skipped } = resolveCommandPlan(command);
  if (run[0]) return run[0];
  if (skipped[0]) {
    throw new Error(
      `Comando "${skipped[0]}" é ignorado no Builder (preview via Sandpack).`,
    );
  }
  throw new Error(
    `Comando não permitido: "${command}". Use apenas: ${[...EXECUTABLE].join(", ")}`,
  );
}
