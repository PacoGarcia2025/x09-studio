import "server-only";

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://studio.x09.com.br",
];

function allowedOrigins(): Set<string> {
  const extra = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}

export function resolveCorsOrigin(request: Request): string | null {
  const origin = request.headers.get("origin") ?? "";
  if (!origin) return null;
  return allowedOrigins().has(origin) ? origin : null;
}

export function corsHeaders(
  request: Request,
  methods: string[] = ["GET", "POST", "OPTIONS"],
): HeadersInit {
  const origin = resolveCorsOrigin(request);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Client-Request-Id",
    "Access-Control-Allow-Methods": methods.join(", "),
    Vary: "Origin",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export function corsPreflight(
  request: Request,
  methods?: string[],
): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, methods),
  });
}
