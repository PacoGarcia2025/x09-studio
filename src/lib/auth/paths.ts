/** Caminho interno seguro para redirect pós-login. */
export function sanitizeNextPath(
  next: string | null | undefined,
  fallback = "/projects",
): string {
  if (!next?.trim()) return fallback;
  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function authLink(
  path: "/login" | "/signup",
  next?: string | null,
): string {
  const safe = sanitizeNextPath(next);
  if (safe === "/projects") return path;
  return `${path}?next=${encodeURIComponent(safe)}`;
}

export function projectCreatePath(prompt: string): string {
  const q = prompt.trim();
  if (q.length < 3) return "/projects#prompt";
  return `/projects/new?q=${encodeURIComponent(q)}`;
}

export function signupForPrompt(prompt: string): string {
  return authLink("/signup", projectCreatePath(prompt));
}

export function loginForPrompt(prompt: string): string {
  return authLink("/login", projectCreatePath(prompt));
}
