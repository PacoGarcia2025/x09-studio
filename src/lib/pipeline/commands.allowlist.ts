/** Comandos permitidos pelo Builder (nunca shell livre). */
const ALLOWED = new Set([
  "npm install",
  "npm ci",
  "npm run build",
  "npm run typecheck",
  "npm run preview",
  "bun install",
  "bun run build",
  "bun run typecheck",
]);

const INSTALL_ONLY = new Set(["npm install", "npm ci", "bun install"]);

export function listAllowedCommands(): string[] {
  return [...ALLOWED];
}

function normalizePiece(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

/**
 * Aceita comando único ou cadeia com && / ; .
 * Se a IA misturar comandos inválidos (ex: migrate), ignora a cadeia
 * (ou só mantém install) — não derruba o build da landing.
 */
export function resolveAllowedCommands(command: string): string[] {
  const pieces = command
    .split(/&&|;/)
    .map(normalizePiece)
    .filter(Boolean);

  if (pieces.length === 0) return [];

  const allowed = pieces.filter((p) => ALLOWED.has(p));
  const hadDisallowed = pieces.some((p) => !ALLOWED.has(p));

  if (hadDisallowed) {
    return allowed.filter((p) => INSTALL_ONLY.has(p));
  }

  return allowed;
}

export function assertAllowedCommand(command: string): string {
  const resolved = resolveAllowedCommands(command);
  if (resolved.length === 0) {
    throw new Error(
      `Comando não permitido: "${command}". Use apenas: ${[...ALLOWED].join(", ")}`,
    );
  }
  return resolved[0]!;
}
