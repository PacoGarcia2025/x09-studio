import { createAdminClient } from "@/lib/supabase/admin";
import { verifyGitHubWebhookSignature } from "@/lib/github/app.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const deliveryId = request.headers.get("x-github-delivery");
  const event = request.headers.get("x-github-event") || "unknown";

  if (!verifyGitHubWebhookSignature(raw, signature)) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  if (!deliveryId) {
    return Response.json({ error: "missing_delivery" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("github_webhook_deliveries").insert({
    delivery_id: deliveryId,
    event,
    payload: JSON.parse(raw) as object,
  });

  if (error?.code === "23505") {
    return Response.json({ ok: true, duplicate: true });
  }
  if (error) {
    return Response.json({ error: "persist_failed" }, { status: 500 });
  }

  // Installation suspension / deletion
  try {
    const payload = JSON.parse(raw) as {
      action?: string;
      installation?: { id?: number };
    };
    if (
      event === "installation" &&
      (payload.action === "deleted" || payload.action === "suspend") &&
      payload.installation?.id
    ) {
      await admin
        .from("github_installations")
        .update({
          suspended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("installation_id", payload.installation.id);
    }
  } catch {
    // ignore parse side-effects
  }

  return Response.json({ ok: true });
}
