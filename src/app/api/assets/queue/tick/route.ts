import { assertWorkspaceOwner } from "@/lib/ai-engine/ownership";
import { tickAssetJobQueue } from "@/lib/asset-jobs/queue";
import {
  SCHEMA_PENDING_MESSAGE,
  isMissingRelationError,
} from "@/lib/assets/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Watch = {
  id: string;
  status: string;
  error_message: string | null;
  asset_id: string | null;
};

/**
 * Tick curto da fila (sessão do utilizador). Cada pedido só avança um passo —
 * a geração comercial não pode ficar bloqueada num POST de 12 minutos,
 * senão o proxy corta e o Next devolve HTML.
 */
export async function POST(request: Request) {
  const gate = await assertWorkspaceOwner();
  if (gate.error || !gate.workspaceId) {
    return Response.json(
      { ok: false, error: gate.error ?? "Não autenticado" },
      { status: 401 },
    );
  }

  let watchJobId: string | null = null;
  try {
    const body = (await request.json()) as { jobId?: unknown };
    if (typeof body.jobId === "string" && body.jobId.trim()) {
      watchJobId = body.jobId.trim();
    }
  } catch {
    /* corpo vazio = só processa o próximo job */
  }

  const tick = await tickAssetJobQueue(gate.supabase, {
    workspaceId: gate.workspaceId,
  });

  if (!tick.ok) {
    const error = isMissingRelationError({ message: tick.error })
      ? SCHEMA_PENDING_MESSAGE
      : tick.error;
    return Response.json({ ok: false, error }, { status: 400 });
  }

  let watch: Watch | null = null;
  if (watchJobId) {
    const { data } = await gate.supabase
      .from("asset_jobs")
      .select("id, status, error_message, asset_id")
      .eq("id", watchJobId)
      .eq("workspace_id", gate.workspaceId)
      .maybeSingle();
    if (data) watch = data as Watch;
  }

  return Response.json({ ...tick, watch });
}
