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

export function assertAllowedCommand(command: string): string {
  const normalized = command.trim().replace(/\s+/g, " ");
  if (!ALLOWED.has(normalized)) {
    throw new Error(
      `Comando não permitido: "${command}". Use apenas: ${[...ALLOWED].join(", ")}`,
    );
  }
  return normalized;
}

export function listAllowedCommands(): string[] {
  return [...ALLOWED];
}
