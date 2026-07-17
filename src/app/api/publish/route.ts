import { NextResponse } from "next/server";
import {
  AuthError,
  assertRateLimit,
  requireUserFromRequest,
} from "@/lib/agent/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PublishBodySchema = z.object({
  projectId: z.string().uuid(),
  migrations: z
    .array(
      z.object({
        path: z.string(),
        sql: z.string().max(200_000),
        destructive: z.boolean().default(false),
      }),
    )
    .max(40),
  confirmDestructive: z.boolean().default(false),
});

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://studio.x09.com.br",
]);

function cors(request: Request): HeadersInit {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://studio.x09.com.br",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request) });
}

/**
 * Publicação segura: valida plano e devolve o que seria aplicado.
 * Aplicação real no projeto Supabase do cliente fica atrás de confirmação.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUserFromRequest(request);
    assertRateLimit(user.id, 10, 60_000);

    const body = PublishBodySchema.parse(await request.json());
    const destructive = body.migrations.filter((m) => m.destructive);

    if (destructive.length && !body.confirmDestructive) {
      return NextResponse.json(
        {
          ok: false,
          error: "Migrations destrutivas exigem confirmDestructive=true",
          destructive: destructive.map((d) => d.path),
        },
        { status: 400, headers: cors(request) },
      );
    }

    // Gate: não executa SQL automaticamente neste marco — retorna plano aprovado.
    return NextResponse.json(
      {
        ok: true,
        mode: "supabase",
        projectId: body.projectId,
        applied: body.migrations.map((m) => m.path),
        note: "Plano aprovado. Wire de execução SQL por projeto do cliente no próximo deploy.",
      },
      { headers: cors(request) },
    );
  } catch (error) {
    const status = error instanceof AuthError ? 401 : 500;
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Publish falhou",
      },
      { status, headers: cors(request) },
    );
  }
}
