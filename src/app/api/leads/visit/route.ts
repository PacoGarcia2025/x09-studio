import { NextResponse } from "next/server";
import { z } from "zod";
import { sendLeadEmailViaResend } from "@/lib/leads/resend.server";
import { corsHeaders, corsPreflight } from "@/lib/http/cors";

export const dynamic = "force-dynamic";

const VisitLeadSchema = z.object({
  propertyId: z.string().min(1).max(80),
  propertyTitle: z.string().min(1).max(200),
  brokerName: z.string().min(1).max(120).optional(),
  brokerEmail: z.string().email().optional(),
  clientName: z.string().min(2).max(120),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(8).max(30).optional(),
  visitDate: z.string().min(4).max(40),
  siteSlug: z.string().max(80).optional(),
});

function resolveBrokerInbox(brokerEmail?: string): string | null {
  const direct = brokerEmail?.trim();
  if (direct) return direct;
  const fallback = process.env.STUDIO_LEADS_FALLBACK_EMAIL?.trim();
  return fallback || null;
}

export async function OPTIONS(request: Request) {
  return corsPreflight(request, ["POST", "OPTIONS"]);
}

export async function POST(request: Request) {
  const headers = corsHeaders(request, ["POST", "OPTIONS"]);

  try {
    const body = VisitLeadSchema.parse(await request.json());
    const to = resolveBrokerInbox(body.brokerEmail);
    if (!to) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "E-mail do corretor não informado. Configure brokerEmail ou STUDIO_LEADS_FALLBACK_EMAIL.",
        },
        { status: 400, headers },
      );
    }

    const subject = `Visita agendada — ${body.propertyTitle} (Ref. ${body.propertyId})`;
    const html = `
      <h2>Novo lead — agendamento de visita</h2>
      <p><strong>Imóvel:</strong> ${body.propertyTitle}</p>
      <p><strong>Referência:</strong> ${body.propertyId}</p>
      ${body.brokerName ? `<p><strong>Corretor:</strong> ${body.brokerName}</p>` : ""}
      ${body.siteSlug ? `<p><strong>Site:</strong> ${body.siteSlug}</p>` : ""}
      <hr />
      <p><strong>Cliente:</strong> ${body.clientName}</p>
      <p><strong>E-mail:</strong> ${body.clientEmail}</p>
      ${body.clientPhone ? `<p><strong>Telefone:</strong> ${body.clientPhone}</p>` : ""}
      <p><strong>Data preferida:</strong> ${body.visitDate}</p>
    `.trim();

    const sent = await sendLeadEmailViaResend({
      to,
      subject,
      html,
      replyTo: body.clientEmail,
    });

    if (!sent.ok) {
      return NextResponse.json(
        { ok: false, error: sent.error },
        { status: 502, headers },
      );
    }

    return NextResponse.json({ ok: true, id: sent.id }, { headers });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((i) => i.message).join("; ")
        : error instanceof Error
          ? error.message
          : "Payload inválido";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400, headers },
    );
  }
}
