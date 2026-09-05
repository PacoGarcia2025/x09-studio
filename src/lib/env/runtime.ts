import fs from "node:fs";
import path from "node:path";

function liveEnv(name: string): string {
  const value = (process.env as NodeJS.Dict<string>)[name];
  return typeof value === "string" ? value.trim() : "";
}

/** Lê env em runtime — acesso por chave evita o bundler fixar o valor no build. */
export function runtimeEnv(name: string): string {
  const live = liveEnv(name);
  if (live) return live;
  const fromFile = envFromDotFiles()[name];
  return fromFile?.trim() || "";
}

export function runtimeEnvFlag(name: string): boolean {
  return runtimeEnv(name) === "true";
}

/** Raiz do repo na VPS (PM2) ou pasta acima de `.next/standalone`. */
export function studioAppRoot(): string {
  const explicit = liveEnv("STUDIO_APP_ROOT");
  if (explicit) return path.resolve(explicit);
  const cwd = process.cwd();
  const normalized = cwd.replace(/\\/g, "/");
  if (normalized.endsWith("/.next/standalone")) {
    return path.resolve(cwd, "..", "..");
  }
  return cwd;
}

let fileCache: Record<string, string> | null = null;

function shouldReadDotFiles(): boolean {
  if (liveEnv("NODE_ENV") === "test") return false;
  return liveEnv("NODE_ENV") === "production" || Boolean(liveEnv("STUDIO_APP_ROOT"));
}

function envFromDotFiles(): Record<string, string> {
  if (!shouldReadDotFiles()) return {};
  if (fileCache) return fileCache;
  const merged: Record<string, string> = {};
  const roots = new Set<string>([studioAppRoot(), process.cwd()]);
  for (const root of roots) {
    for (const name of [".env", ".env.local"]) {
      Object.assign(merged, parseEnvFile(path.join(root, name)));
    }
  }
  fileCache = merged;
  return merged;
}

function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    if (!fs.existsSync(filePath)) return out;
    const content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const withoutExport = trimmed.startsWith("export ")
        ? trimmed.slice(7).trim()
        : trimmed;
      const match = withoutExport.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (!match) continue;
      let val = (match[2] ?? "").trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[match[1]] = val.trim();
    }
  } catch {
    return out;
  }
  return out;
}
