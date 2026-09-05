/** Lê env em runtime — acesso por chave evita o bundler fixar o valor no build. */
export function runtimeEnv(name: string): string {
  const value = (process.env as NodeJS.Dict<string>)[name];
  return typeof value === "string" ? value.trim() : "";
}

export function runtimeEnvFlag(name: string): boolean {
  return runtimeEnv(name) === "true";
}
