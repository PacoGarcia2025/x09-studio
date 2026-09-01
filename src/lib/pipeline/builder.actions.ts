"use server";

import { revalidatePath } from "next/cache";
import {
  recoverStaleBuilderTasks,
  tickBuilderQueue,
} from "@/lib/pipeline/queue.server";
import { isHomePageTaskPath } from "@/lib/pipeline/build-phases";
import {
  critiqueGeneratedApp,
  critiqueHomePreview,
} from "@/lib/pipeline/quality-critic.server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function assertPlanOwner(planId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" as const };

  const { data: plan } = await supabase
    .from("plans")
    .select("id, project_id, status")
    .eq("id", planId)
    .maybeSingle();

  if (!plan) return { error: "Plano não encontrado" as const };

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, workspace_id, brief_prompt, status")
    .eq("id", plan.project_id)
    .maybeSingle();

  if (!project) return { error: "Projeto não encontrado" as const };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", project.workspace_id)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) {
    return { error: "Sem permissão" as const };
  }

  return { supabase, plan, project, error: null };
}

export type BuildState = {
  planId: string;
  planStatus: string;
  projectStatus: string;
  tasks: Array<{
    id: string;
    task_key: string;
    type: string;
    title: string;
    path: string | null;
    status: string;
    error_message: string | null;
    sort_order: number;
  }>;
  logs: Array<{
    id: string;
    task_id: string | null;
    level: string;
    message: string;
    created_at: string;
  }>;
  counts: {
    queued: number;
    running: number;
    retrying: number;
    done: number;
    failed: number;
    skipped: number;
    total: number;
  };
};

async function countSkippedTasks(
  supabase: SupabaseClient,
  planId: string,
): Promise<number> {
  const { count } = await supabase
    .from("plan_tasks")
    .select("*", { count: "exact", head: true })
    .eq("plan_id", planId)
    .eq("status", "skipped");
  return count ?? 0;
}

export async function getBuildState(
  planId: string,
): Promise<{ ok: true; data: BuildState } | { ok: false; error: string }> {
  const gate = await assertPlanOwner(planId);
  if (gate.error || !gate.supabase || !gate.plan || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  const { data: tasks } = await gate.supabase
    .from("plan_tasks")
    .select(
      "id, task_key, type, title, path, status, error_message, sort_order",
    )
    .eq("plan_id", planId)
    .order("sort_order", { ascending: true });

  const { data: logs } = await gate.supabase
    .from("plan_task_logs")
    .select("id, task_id, level, message, created_at")
    .eq("plan_id", planId)
    .order("created_at", { ascending: true })
    .limit(200);

  const list = tasks ?? [];
  return {
    ok: true,
    data: {
      planId,
      planStatus: gate.plan.status,
      projectStatus: gate.project.status ?? "draft",
      tasks: list,
      logs: logs ?? [],
      counts: {
        queued: list.filter((t) => t.status === "queued").length,
        running: list.filter((t) => t.status === "running").length,
        retrying: list.filter((t) => t.status === "retrying").length,
        done: list.filter((t) => t.status === "done").length,
        failed: list.filter((t) => t.status === "failed").length,
        skipped: list.filter((t) => t.status === "skipped").length,
        total: list.length,
      },
    },
  };
}

/** Retoma fila sem resetar tasks já concluídas (ex.: após F5). */
export async function resumeBuildAction(
  planId: string,
): Promise<{ ok: true; resumed: boolean } | { ok: false; error: string }> {
  const gate = await assertPlanOwner(planId);
  if (gate.error || !gate.supabase || !gate.plan || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  const { data: tasks } = await gate.supabase
    .from("plan_tasks")
    .select("status")
    .eq("plan_id", planId);

  const list = tasks ?? [];
  const allDone = list.every(
    (t) => t.status === "done" || t.status === "skipped",
  );
  if (allDone) {
    return { ok: true, resumed: false };
  }

  await recoverStaleBuilderTasks(gate.supabase, planId);

  await gate.supabase
    .from("plans")
    .update({ status: "building", error_message: null })
    .eq("id", planId);

  await gate.supabase
    .from("projects")
    .update({ status: "generating" })
    .eq("id", gate.project.id);

  revalidatePath(`/projects/${gate.project.id}`);
  return { ok: true, resumed: true };
}

export async function startBuildAction(
  planId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertPlanOwner(planId);
  if (gate.error || !gate.supabase || !gate.plan || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  const { data: tasks } = await gate.supabase
    .from("plan_tasks")
    .select("id, path")
    .eq("plan_id", planId);

  for (const task of tasks ?? []) {
    const isHome = isHomePageTaskPath(task.path);
    await gate.supabase
      .from("plan_tasks")
      .update({
        status: isHome ? "queued" : "skipped",
        error_message: null,
        started_at: null,
        finished_at: null,
      })
      .eq("id", task.id);
  }

  await gate.supabase.from("plan_task_logs").delete().eq("plan_id", planId);

  await gate.supabase
    .from("plans")
    .update({ status: "building", error_message: null })
    .eq("id", planId);

  await gate.supabase.from("projects").update({ status: "generating" }).eq(
    "id",
    gate.project.id,
  );

  revalidatePath(`/projects/${gate.project.id}`);
  return { ok: true };
}

/** Desbloqueia tasks da fase 2 (login, app, dashboard…) após home pronta. */
export async function continueFullBuildAction(
  planId: string,
): Promise<
  { ok: true; unskipped: number } | { ok: false; error: string }
> {
  const gate = await assertPlanOwner(planId);
  if (gate.error || !gate.supabase || !gate.plan || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  const skippedCount = await countSkippedTasks(gate.supabase, planId);
  if (skippedCount === 0) {
    return {
      ok: false,
      error: "Não há etapas pendentes — o app já está completo.",
    };
  }

  await gate.supabase
    .from("plan_tasks")
    .update({
      status: "queued",
      error_message: null,
      started_at: null,
      finished_at: null,
    })
    .eq("plan_id", planId)
    .eq("status", "skipped");

  await gate.supabase
    .from("plans")
    .update({ status: "building", error_message: null })
    .eq("id", planId);

  await gate.supabase
    .from("projects")
    .update({ status: "generating" })
    .eq("id", gate.project.id);

  revalidatePath(`/projects/${gate.project.id}`);
  return { ok: true, unskipped: skippedCount };
}

export async function requeueBuildTaskAction(
  taskId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: task } = await supabase
    .from("plan_tasks")
    .select("id, plan_id, status")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) return { ok: false, error: "Task não encontrada" };

  const gate = await assertPlanOwner(task.plan_id);
  if (gate.error || !gate.supabase || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  if (task.status !== "failed") {
    return { ok: false, error: "Apenas tasks failed podem ser reexecutadas." };
  }

  await gate.supabase
    .from("plan_tasks")
    .update({
      status: "queued",
      error_message: null,
      started_at: null,
      finished_at: null,
    })
    .eq("id", taskId);

  await gate.supabase
    .from("plans")
    .update({ status: "building", error_message: null })
    .eq("id", task.plan_id);

  await gate.supabase
    .from("projects")
    .update({ status: "generating" })
    .eq("id", gate.project.id);

  revalidatePath(`/projects/${gate.project.id}`);
  return { ok: true };
}

export async function tickBuildAction(planId: string): Promise<
  | {
      ok: true;
      done: boolean;
      failed: boolean;
      processed: boolean;
      message: string;
      currentTaskKey: string | null;
      counts: BuildState["counts"];
      /** true quando só a Home foi gerada e há tasks skipped na fila. */
      homePhaseOnly?: boolean;
    }
  | { ok: false; error: string }
> {
  const gate = await assertPlanOwner(planId);
  if (gate.error || !gate.supabase || !gate.plan || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  try {
    const tick = await tickBuilderQueue(gate.supabase, {
      planId,
      projectId: gate.project.id,
      projectName: gate.project.name,
    });

    if (tick.done && !tick.failed) {
      const { repairProjectSourceIssues } = await import(
        "@/lib/projects/import-graph.server"
      );
      await repairProjectSourceIssues(gate.project.id);

      const { data: planRow } = await gate.supabase
        .from("plans")
        .select("prompt")
        .eq("id", planId)
        .maybeSingle();
      const briefPrompt =
        gate.project.brief_prompt?.trim() || planRow?.prompt?.trim() || "";

      const skippedCount = await countSkippedTasks(gate.supabase, planId);
      const homePhaseOnly = skippedCount > 0;

      const quality = homePhaseOnly
        ? await critiqueHomePreview(gate.project.id, briefPrompt || undefined)
        : await critiqueGeneratedApp(
            gate.project.id,
            briefPrompt || undefined,
          );
      if (!quality.ok) {
        const detail = quality.issues
          .filter((i) => i.severity === "error")
          .slice(0, 3)
          .map((i) => i.message)
          .join("; ");
        await gate.supabase
          .from("projects")
          .update({ status: "error" })
          .eq("id", gate.project.id);
        return {
          ok: true,
          done: true,
          failed: true,
          processed: tick.processed,
          message: `Qualidade insuficiente (score ${quality.score}/100): ${detail || "gere de novo pelo chat"}`,
          currentTaskKey: null,
          counts: tick.counts,
          homePhaseOnly,
        };
      }

      await gate.supabase
        .from("projects")
        .update({ status: "ready" })
        .eq("id", gate.project.id);
      revalidatePath(`/projects/${gate.project.id}`);

      return {
        ok: true,
        done: tick.done,
        failed: tick.failed,
        processed: tick.processed,
        message: tick.message,
        currentTaskKey: tick.currentTaskKey,
        counts: tick.counts,
        homePhaseOnly,
      };
    }
    if (tick.failed) {
      await gate.supabase
        .from("projects")
        .update({ status: "error" })
        .eq("id", gate.project.id);
      revalidatePath(`/projects/${gate.project.id}`);
    }

    return {
      ok: true,
      done: tick.done,
      failed: tick.failed,
      processed: tick.processed,
      message: tick.message,
      currentTaskKey: tick.currentTaskKey,
      counts: tick.counts,
      homePhaseOnly: false,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha no tick do builder",
    };
  }
}
