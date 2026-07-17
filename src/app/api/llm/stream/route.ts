import { AuthError, assertRateLimit, requireUserFromRequest } from "@/lib/agent/auth";
import { runAgentStream } from "@/lib/agent/orchestrator";
import { StreamRequestSchema, type GenerationEvent } from "@/lib/agent/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "https://studio.x09.com.br",
]);

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://studio.x09.com.br";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const headers = {
    ...corsHeaders(request),
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };

  try {
    const user = await requireUserFromRequest(request);
    assertRateLimit(user.id);

    const json = await request.json();
    const parsed = StreamRequestSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400, headers: corsHeaders(request) },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: GenerationEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        };

        const abort = new AbortController();
        request.signal.addEventListener("abort", () => abort.abort());

        try {
          await runAgentStream(parsed.data, send, abort.signal);
        } catch (error) {
          send({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Falha no streaming do agente.",
          });
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, { status: 200, headers });
  } catch (error) {
    const status =
      error instanceof AuthError
        ? 401
        : typeof error === "object" &&
            error &&
            "status" in error &&
            typeof (error as { status: unknown }).status === "number"
          ? (error as { status: number }).status
          : 500;

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Erro interno do agente.",
      },
      { status, headers: corsHeaders(request) },
    );
  }
}
