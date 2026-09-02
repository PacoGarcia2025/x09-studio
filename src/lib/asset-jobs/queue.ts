import type { SupabaseClient } from "@supabase/supabase-js";
import { getAssetJobStaleMs } from "@/lib/asset-jobs/config";
import { getAssetProcessor } from "@/lib/asset-jobs/processors/registry";
import {
  ASSET_JOB_SELECT,
  type AssetJobRow,
} from "@/lib/asset-jobs/types";
import { getAssetStorage } from "@/lib/storage/registry";
import { isMissingRelationError } from "@/lib/assets/schema";
import { refundReservedAssetJobCredits } from "@/lib/billing/asset-job-credits";

export type AssetQueueTick =
  | {
      ok: true;
      processed: boolean;
      done: boolean;
      jobId: string | null;
      status: string | null;
      message: string;
    }
  | { ok: false; error: string };

function mergeMeta(
  current: Record<string, unknown> | null | undefined,
  extra: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return { ...(current ?? {}), ...(extra ?? {}) };
}

export async function recoverStaleAssetJobs(
  supabase: SupabaseClient,
  workspaceId?: string,
): Promise<number> {
  let query = supabase
    .from("asset_jobs")
    .select("id, started_at, status")
    .in("status", ["running", "retrying"]);

  if (workspaceId) query = query.eq("workspace_id", workspaceId);

  const { data: jobs, error } = await query;
  if (error) throw error;
  if (!jobs?.length) return 0;

  const now = Date.now();
  const stale = jobs.filter((job) => {
    if (!job.started_at) return true;
    return now - new Date(job.started_at).getTime() > getAssetJobStaleMs();
  });
  if (stale.length === 0) return 0;

  await supabase
    .from("asset_jobs")
    .update({
      status: "queued",
      error_message: null,
      started_at: null,
      finished_at: null,
    })
    .in(
      "id",
      stale.map((j) => j.id),
    );

  return stale.length;
}

async function pickNextJob(
  supabase: SupabaseClient,
  workspaceId?: string,
): Promise<AssetJobRow | null> {
  let query = supabase
    .from("asset_jobs")
    .select(ASSET_JOB_SELECT)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (workspaceId) query = query.eq("workspace_id", workspaceId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as AssetJobRow;
}

/**
 * Processa no máximo um job queued.
 * O tick espera o processor terminar — a fila não conhece motors nem capabilities.
 */
export async function tickAssetJobQueue(
  supabase: SupabaseClient,
  options?: { workspaceId?: string },
): Promise<AssetQueueTick> {
  try {
    await recoverStaleAssetJobs(supabase, options?.workspaceId);
    const job = await pickNextJob(supabase, options?.workspaceId);
    if (!job) {
      return {
        ok: true,
        processed: false,
        done: true,
        jobId: null,
        status: null,
        message: "Fila vazia",
      };
    }

    const claimed = await supabase
      .from("asset_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("id");

    if (!claimed.data?.length) {
      return {
        ok: true,
        processed: false,
        done: false,
        jobId: job.id,
        status: "queued",
        message: "Job já foi reivindicado",
      };
    }

    const processor = getAssetProcessor();
    const result = await processor.process({
      job,
      storage: getAssetStorage(),
    });

    const finished = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("asset_jobs")
      .update({
        status: result.status,
        output_path: result.outputPath ?? job.output_path,
        error_message:
          result.status === "failed" ? result.message.slice(0, 2000) : null,
        finished_at: finished,
        meta: mergeMeta(job.meta, result.meta),
      })
      .eq("id", job.id);

    if (updateError) {
      if (isMissingRelationError(updateError)) {
        return { ok: false, error: updateError.message };
      }
      return { ok: false, error: updateError.message };
    }

    if (result.status === "done" && job.asset_id) {
      const outputPath = result.outputPath ?? job.output_path;
      const fromMeta = result.meta?.byteSize;
      let byteSize =
        typeof fromMeta === "number" && fromMeta > 0 ? fromMeta : 0;
      if (!byteSize && outputPath) {
        try {
          const bytes = await getAssetStorage().readFile(outputPath);
          byteSize = bytes.byteLength;
        } catch {
          byteSize = 0;
        }
      }
      if (byteSize > 0) {
        await supabase
          .from("assets")
          .update({ byte_size: byteSize, status: "ready" })
          .eq("id", job.asset_id);
      }
    }

    if (
      (result.status === "failed" || result.status === "skipped") &&
      job.credits_reserved > 0
    ) {
      try {
        await refundReservedAssetJobCredits(job);
      } catch (err) {
        console.error(
          `[asset-job] ${job.id} falhou o reembolso de créditos:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    return {
      ok: true,
      processed: true,
      done: false,
      jobId: job.id,
      status: result.status,
      message: result.message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha na fila";
    if (isMissingRelationError({ message })) {
      return { ok: false, error: message };
    }
    return { ok: false, error: message };
  }
}
