function firstHeader(
  headers: { get(name: string): string | null },
  name: string,
): string {
  return headers.get(name)?.split(",")[0]?.trim() ?? "";
}

function isLoopbackHost(host: string): boolean {
  const hostname = host.replace(/:\d+$/, "").toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

/** Origem pública atrás do Nginx — não usar HOSTNAME=127.0.0.1 do processo. */
export function publicOriginFromHeaders(
  headers: { get(name: string): string | null },
  fallbackOrigin?: string,
): string {
  const app = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const host =
    firstHeader(headers, "x-forwarded-host") || firstHeader(headers, "host");
  const proto = firstHeader(headers, "x-forwarded-proto");

  if (host && !isLoopbackHost(host)) {
    return `${proto || "https"}://${host}`;
  }
  if (app && !isLoopbackHost(app.replace(/^https?:\/\//, ""))) {
    return app;
  }
  if (fallbackOrigin) return fallbackOrigin;
  if (host) return `${proto || "http"}://${host}`;
  return "https://studio.x09.com.br";
}
