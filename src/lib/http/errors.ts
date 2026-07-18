import "server-only";

export class PublicError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "PublicError";
    this.status = status;
    this.code = code;
  }
}

export function publicErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof PublicError) return error.message;
  if (error instanceof Error && error.name === "AuthError") return error.message;
  // Never leak internals / stack / SQL to clients
  return fallback;
}

export function jsonError(
  error: unknown,
  fallback: string,
  headers?: HeadersInit,
): Response {
  const status =
    error instanceof PublicError
      ? error.status
      : typeof error === "object" &&
          error &&
          "status" in error &&
          typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : 500;

  const body: { error: string; code?: string } = {
    error: publicErrorMessage(error, fallback),
  };
  if (error instanceof PublicError && error.code) {
    body.code = error.code;
  }

  return Response.json(body, { status, headers });
}
