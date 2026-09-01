import { tickAssetJobQueue } from "@/lib/asset-jobs/queue";
import { ASSET_JOB_TICK_MAX_DURATION_SEC } from "@/lib/asset-jobs/config";
import { createServiceClient } from "@/lib/supabase/service-client";

export const dynamic = "force-dynamic";
export const maxDuration = ASSET_JOB_TICK_MAX_DURATION_SEC;

function authorized(request: Request): boolean {
  const secret = process.env.STUDIO_ASSET_WORKER_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Tick remoto da fila (worker isolado). Duração alinhada a jobs longos.
 */
export async function POST(request: Request) {
  if (!process.env.STUDIO_ASSET_WORKER_SECRET?.trim()) {
    return Response.json(
      { error: "STUDIO_ASSET_WORKER_SECRET não configurado" },
      { status: 503 },
    );
  }
  if (!authorized(request)) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tick = await tickAssetJobQueue(createServiceClient());
  return Response.json(tick, { status: tick.ok ? 200 : 400 });
}
