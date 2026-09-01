"use server";

import { revalidatePath } from "next/cache";
import { assertWorkspaceOwner } from "@/lib/ai-engine/ownership";
import { tickAssetJobQueue } from "@/lib/asset-jobs/queue";
import {
  SCHEMA_PENDING_MESSAGE,
  isMissingRelationError,
} from "@/lib/assets/schema";

export const maxDuration = 1800;

export async function tickAssetQueueAction(): Promise<
  | {
      ok: true;
      processed: boolean;
      done: boolean;
      jobId: string | null;
      status: string | null;
      message: string;
    }
  | { ok: false; error: string }
> {
  const gate = await assertWorkspaceOwner();
  if (gate.error || !gate.workspaceId) {
    return { ok: false, error: gate.error ?? "Erro ao validar workspace" };
  }

  const tick = await tickAssetJobQueue(gate.supabase, {
    workspaceId: gate.workspaceId,
  });

  if (!tick.ok) {
    if (isMissingRelationError({ message: tick.error })) {
      return { ok: false, error: SCHEMA_PENDING_MESSAGE };
    }
    return tick;
  }

  if (tick.processed) {
    revalidatePath("/assets");
  }
  return tick;
}
