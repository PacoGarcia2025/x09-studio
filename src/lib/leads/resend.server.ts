import "server-only";

type SendLeadEmailInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendLeadEmailViaResend(
  input: SendLeadEmailInput,
): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY não configurada" };
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ??
    "X09 Studio Leads <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      error: body || `Resend HTTP ${res.status}`,
    };
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: data.id };
}
