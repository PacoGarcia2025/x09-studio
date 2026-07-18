import {
  applyVercelWebhook,
  verifyVercelWebhookSignature,
} from "@/lib/deploy/vercel.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature =
    request.headers.get("x-vercel-signature") ||
    request.headers.get("x-vercel-signature-256");

  if (!verifyVercelWebhookSignature(raw, signature)) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: Parameters<typeof applyVercelWebhook>[0];
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await applyVercelWebhook(payload);
  return Response.json(result);
}
