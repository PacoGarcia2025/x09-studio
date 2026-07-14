import type { SupabaseClient } from "@supabase/supabase-js";
import { getLlmProvider } from "@/lib/llm/provider";
import { applyBuilderTask } from "@/lib/pipeline/builder.server";
import type { PlanTaskType } from "@/lib/pipeline/plan-schema";
import { ensureProjectScaffold } from "@/lib/projects/scaffold.server";

export type DbTask = {
  id: string;
  plan_id: string;
  task_key: string;
  type: string;
  title: string;
  instruction: string;
  path: string | null;
  depends_on: string[] | null;
  status: string;
  sort_order: number;
};

async function appendLog(
  supabase: SupabaseClient,
  planId: string,
  taskId: string | null,
  level: "info" | "warn" | "error",
  message: string,
) {
  await supabase.from("plan_task_logs").insert({
    plan_id: planId,
    task_id: taskId,
    level,
    message: message.slice(0, 8000),
  });
}

function depsSatisfied(
  task: DbTask,
  byKey: Map<string, DbTask>,
): boolean {
  const deps = task.depends_on ?? [];
  for (const dep of deps) {
    const other = byKey.get(dep);
    if (!other) continue;
    if (other.status === "failed") return false;
    if (other.status !== "done" && other.status !== "skipped") return false;
  }
  return true;
}

function pickNext(tasks: DbTask[]): DbTask | null {
  const byKey = new Map(tasks.map((t) => [t.task_key, t]));
  const queued = tasks
    .filter((t) => t.status === "queued")
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const task of queued) {
    if (depsSatisfied(task, byKey)) return task;
  }
  return null;
}

export type TickResult = {
  done: boolean;
  failed: boolean;
  currentTaskKey: string | null;
  processed: boolean;
  message: string;
  counts: {
    queued: number;
    running: number;
    done: number;
    failed: number;
    total: number;
  };
};

function counts(tasks: DbTask[]) {
  return {
    queued: tasks.filter((t) => t.status === "queued").length,
    running: tasks.filter((t) => t.status === "running").length,
    done: tasks.filter((t) => t.status === "done").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    total: tasks.length,
  };
}

/**
 * Processa a próxima task elegível do plano (respeita dependsOn).
 */
export async function tickBuilderQueue(
  supabase: SupabaseClient,
  input: {
    planId: string;
    projectId: string;
    projectName: string;
  },
): Promise<TickResult> {
  const { data: tasks, error } = await supabase
    .from("plan_tasks")
    .select(
      "id, plan_id, task_key, type, title, instruction, path, depends_on, status, sort_order",
    )
    .eq("plan_id", input.planId)
    .order("sort_order", { ascending: true });

  if (error || !tasks) {
    throw new Error(error?.message ?? "Falha ao carregar tasks");
  }

  const list = tasks as DbTask[];
  const c0 = counts(list);

  if (list.some((t) => t.status === "failed")) {
    await supabase
      .from("plans")
      .update({ status: "error" })
      .eq("id", input.planId);
    return {
      done: true,
      failed: true,
      currentTaskKey: null,
      processed: false,
      message: "Build interrompido: há task failed",
      counts: c0,
    };
  }

  if (list.every((t) => t.status === "done" || t.status === "skipped")) {
    await supabase
      .from("plans")
      .update({ status: "built" })
      .eq("id", input.planId);
    return {
      done: true,
      failed: false,
      currentTaskKey: null,
      processed: false,
      message: "Todas as tasks convertidas",
      counts: c0,
    };
  }

  const next = pickNext(list);
  if (!next) {
    const stuck = list.filter((t) => t.status === "queued");
    if (stuck.length) {
      await supabase
        .from("plans")
        .update({ status: "error" })
        .eq("id", input.planId);
      await appendLog(
        supabase,
        input.planId,
        null,
        "error",
        "Deadlock de dependsOn: nenhuma task elegível",
      );
      return {
        done: true,
        failed: true,
        currentTaskKey: null,
        processed: false,
        message: "Deadlock de dependsOn",
        counts: counts(list),
      };
    }
    return {
      done: true,
      failed: false,
      currentTaskKey: null,
      processed: false,
      message: "Fila vazia",
      counts: counts(list),
    };
  }

  await supabase
    .from("plan_tasks")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", next.id);

  await appendLog(
    supabase,
    input.planId,
    next.id,
    "info",
    `Iniciando ${next.task_key}: ${next.title}`,
  );

  try {
    await ensureProjectScaffold(input.projectId);
    const provider = getLlmProvider();
    const result = await applyBuilderTask(
      provider,
      input.projectId,
      input.projectName,
      {
        type: next.type as PlanTaskType,
        title: next.title,
        instruction: next.instruction,
        path: next.path,
      },
    );

    await supabase
      .from("plan_tasks")
      .update({
        status: "done",
        finished_at: new Date().toISOString(),
      })
      .eq("id", next.id);

    await appendLog(supabase, input.planId, next.id, "info", result.log);

    const { data: after } = await supabase
      .from("plan_tasks")
      .select("status")
      .eq("plan_id", input.planId);

    const statusList = (after ?? []).map((t) => t.status as string);
    const allDone = statusList.every((s) => s === "done" || s === "skipped");
    if (allDone) {
      await supabase
        .from("plans")
        .update({ status: "built" })
        .eq("id", input.planId);
    }

    return {
      done: allDone,
      failed: false,
      currentTaskKey: next.task_key,
      processed: true,
      message: result.log,
      counts: {
        queued: statusList.filter((s) => s === "queued").length,
        running: statusList.filter((s) => s === "running").length,
        done: statusList.filter((s) => s === "done").length,
        failed: statusList.filter((s) => s === "failed").length,
        total: statusList.length,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro no Builder";
    await supabase
      .from("plan_tasks")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: message.slice(0, 2000),
      })
      .eq("id", next.id);

    await supabase
      .from("plans")
      .update({ status: "error", error_message: message.slice(0, 2000) })
      .eq("id", input.planId);

    await appendLog(supabase, input.planId, next.id, "error", message);

    return {
      done: true,
      failed: true,
      currentTaskKey: next.task_key,
      processed: true,
      message,
      counts: {
        ...c0,
        queued: Math.max(0, c0.queued - 1),
        failed: c0.failed + 1,
      },
    };
  }
}
