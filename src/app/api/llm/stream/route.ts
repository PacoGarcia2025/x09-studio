import { randomUUID } from "node:crypto";
import { AuthError, assertRateLimit, requireUserFromRequest } from "@/lib/agent/auth";
import { runAgentStream } from "@/lib/agent/orchestrator";
import { resolveGenerationMode } from "@/lib/agent/router";
import { StreamRequestSchema, type GenerationEvent } from "@/lib/agent/schemas";
import { debitForGeneration } from "@/lib/billing/credits.server";
import { corsHeaders, corsPreflight } from "@/lib/http/cors";
import { PublicError, jsonError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function OPTIONS(request: Request) {
  return corsPreflight(request, ["POST", "OPTIONS"]);
}

export async function POST(request: Request) {
  const headers = {
    ...corsHeaders(request, ["POST", "OPTIONS"]),
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

    const payload = parsed.data;
    const lastUser =
      [...payload.messages].reverse().find((m) => m.role === "user")?.content ??
      "";

    const mode =
      payload.phase === "repair"
        ? ("repair" as const)
        : payload.phase === "plan"
          ? ("plan" as const)
          : resolveGenerationMode(lastUser, {
              preference: payload.preference,
              hasExistingApp: payload.hasExistingApp,
            });

    const clientRequestId =
      payload.clientRequestId ||
      request.headers.get("x-client-request-id") ||
      randomUUID();

    // Débito atômico ANTES de iniciar o SSE / chamar modelo
    const debit = await debitForGeneration({
      userId: user.id,
      mode,
      phase: payload.phase,
      clientRequestId,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: GenerationEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        };

        send({
          type: "metrics",
          inputTokens: undefined,
          outputTokens: undefined,
        });

        // Informa saldo restante via evento metrics (campos extras são ok no wire)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "credits",
              balance: debit.balance,
              cost: debit.cost,
              billable: debit.billable,
            })}\n\n`,
          ),
        );

        const abort = new AbortController();
        request.signal.addEventListener("abort", () => abort.abort());

        try {
          await runAgentStream(payload, send, abort.signal);
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
    if (error instanceof PublicError && error.status === 402) {
      return Response.json(
        {
          error: error.message,
          code: "insufficient_credits",
        },
        { status: 402, headers: corsHeaders(request) },
      );
    }

    if (error instanceof AuthError) {
      return jsonError(error, "Não autenticado.", corsHeaders(request));
    }

    return jsonError(error, "Erro interno do agente.", corsHeaders(request));
  }
}
