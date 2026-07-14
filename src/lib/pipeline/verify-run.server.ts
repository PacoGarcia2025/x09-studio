import { spawn } from "node:child_process";
import { getProjectDir } from "@/lib/projects/paths";

/** Comandos que o Verify pode executar (somente leitura de código-fonte). */
const VERIFY_COMMANDS = new Set([
  "npm install",
  "npm ci",
  "npm run build",
  "npm run lint",
  "npm run typecheck",
]);

export type CommandResult = {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  output: string;
  durationMs: number;
  timedOut: boolean;
};

/**
 * Executa comando no diretório do projeto gerado.
 * Nunca altera código-fonte — apenas instala deps / build / lint / tsc.
 */
export async function runVerifyCommand(
  projectId: string,
  command: string,
  timeoutMs = 180_000,
): Promise<CommandResult> {
  const normalized = command.trim().replace(/\s+/g, " ");
  if (!VERIFY_COMMANDS.has(normalized)) {
    throw new Error(`Comando Verify não permitido: ${command}`);
  }

  const cwd = getProjectDir(projectId);
  const isWin = process.platform === "win32";
  const started = Date.now();

  return new Promise((resolve) => {
    const child = spawn(normalized, {
      cwd,
      shell: true,
      windowsHide: isWin,
      env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
      if (stdout.length > 80_000) stdout = stdout.slice(-60_000);
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > 80_000) stderr = stderr.slice(-60_000);
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      const msg = err.message;
      resolve({
        command: normalized,
        exitCode: 1,
        stdout,
        stderr: msg,
        output: msg.slice(-8000),
        durationMs: Date.now() - started,
        timedOut,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const combined = `${stdout}\n${stderr}`.trim();
      resolve({
        command: normalized,
        exitCode: timedOut ? 124 : code,
        stdout,
        stderr,
        output: (timedOut
          ? `Timeout (${timeoutMs}ms): ${normalized}\n${combined}`
          : combined
        ).slice(-8000),
        durationMs: Date.now() - started,
        timedOut,
      });
    });
  });
}
