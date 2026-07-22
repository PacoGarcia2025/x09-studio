import type { SupabaseClient } from "@supabase/supabase-js";
import { getLlmProvider } from "@/lib/llm/provider";
import { applyBuilderTask } from "@/lib/pipeline/builder.server";
import type { PlanTaskType } from "@/lib/pipeline/plan-schema";
import { ensureProjectScaffold } from "@/lib/projects/scaffold.server";

const RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 16_000, 30_000];
/** Task running/retrying além disso = servidor caiu ou timeout — volta para queued. */
const STALE_TASK_MS = 4 * 60 * 1000;

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
    retrying: number;
    done: number;
    failed: number;
    total: number;
  };
};

function counts(tasks: DbTask[]) {
  return {
    queued: tasks.filter((t) => t.status === "queued").length,
    running: tasks.filter((t) => t.status === "running").length,
    retrying: tasks.filter((t) => t.status === "retrying").length,
    done: tasks.filter((t) => t.status === "done").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    total: tasks.length,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientAiError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /\b429\b/.test(message) ||
    /\b503\b/.test(message) ||
    /RESOURCE_EXHAUSTED/i.test(message) ||
    /Service Unavailable/i.test(message) ||
    /high demand/i.test(message)
  );
}

function hasEligibleQueuedTask(tasks: DbTask[]): boolean {
  return pickNext(tasks) !== null;
}

/**
 * Tasks presas em running/retrying (ex.: F5 ou timeout do server action) voltam à fila.
 */
export async function recoverStaleBuilderTasks(
  supabase: SupabaseClient,
  planId: string,
): Promise<number> {
  const { data: tasks } = await supabase
    .from("plan_tasks")
    .select("id, task_key, status, started_at")
    .eq("plan_id", planId)
    .in("status", ["running", "retrying"]);

  if (!tasks?.length) return 0;

  const now = Date.now();
  const stale = tasks.filter((t) => {
    if (!t.started_at) return true;
    return now - new Date(t.started_at).getTime() > STALE_TASK_MS;
  });

  if (stale.length === 0) return 0;

  await supabase
    .from("plan_tasks")
    .update({
      status: "queued",
      error_message: null,
      started_at: null,
      finished_at: null,
    })
    .in(
      "id",
      stale.map((t) => t.id),
    );

  await appendLog(
    supabase,
    planId,
    null,
    "warn",
    `Recuperadas ${stale.length} task(s) travada(s): ${stale.map((t) => t.task_key).join(", ")}`,
  );

  return stale.length;
}

function hasBlockedQueuedTasks(tasks: DbTask[]): boolean {
  const byKey = new Map(tasks.map((t) => [t.task_key, t]));
  return tasks.some((task) => {
    if (task.status !== "queued") return false;
    return (task.depends_on ?? []).some((dep) => {
      const other = byKey.get(dep);
      return other?.status === "failed";
    });
  });
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
  const [{ data: planRow }, { data: projectRow }] = await Promise.all([
    supabase.from("plans").select("prompt").eq("id", input.planId).maybeSingle(),
    supabase
      .from("projects")
      .select("brief_prompt")
      .eq("id", input.projectId)
      .maybeSingle(),
  ]);
  const briefPrompt =
    projectRow?.brief_prompt?.trim() || planRow?.prompt?.trim() || null;

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

  await recoverStaleBuilderTasks(supabase, input.planId);

  const { data: refreshed } = await supabase
    .from("plan_tasks")
    .select(
      "id, plan_id, task_key, type, title, instruction, path, depends_on, status, sort_order",
    )
    .eq("plan_id", input.planId)
    .order("sort_order", { ascending: true });

  const list = (refreshed ?? tasks) as DbTask[];
  const c0 = counts(list);

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
    if (list.some((t) => t.status === "running" || t.status === "retrying")) {
      return {
        done: false,
        failed: false,
        currentTaskKey: null,
        processed: false,
        message: "Aguardando task em execução/retry",
        counts: c0,
      };
    }

    const hasFailed = list.some((t) => t.status === "failed");
    if (hasFailed || hasBlockedQueuedTasks(list)) {
      await supabase
        .from("plans")
        .update({ status: "error" })
        .eq("id", input.planId);
      await appendLog(
        supabase,
        input.planId,
        null,
        "error",
        hasFailed
          ? "Build concluído com task failed. Tasks independentes foram processadas."
          : "Deadlock de dependsOn: nenhuma task elegível",
      );
      return {
        done: true,
        failed: true,
        currentTaskKey: null,
        processed: false,
        message: hasFailed
          ? "Build concluído com falhas"
          : "Deadlock de dependsOn",
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
    await ensureProjectScaffold(input.projectId, { briefPrompt });
    const provider = getLlmProvider();
    let result: Awaited<ReturnType<typeof applyBuilderTask>> | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        await supabase
          .from("plan_tasks")
          .update({ status: "running" })
          .eq("id", next.id);

        result = await applyBuilderTask(
          provider,
          input.projectId,
          input.projectName,
          {
            type: next.type as PlanTaskType,
            title: next.title,
            instruction: next.instruction,
            path: next.path,
          },
          { briefPrompt },
        );
        break;
      } catch (err) {
        lastError = err;
        if (!isTransientAiError(err) || attempt === RETRY_DELAYS_MS.length) {
          throw err;
        }

        const delay = RETRY_DELAYS_MS[attempt]!;
        const message =
          err instanceof Error ? err.message : "Falha temporária na IA";

        await supabase
          .from("plan_tasks")
          .update({
            status: "retrying",
            error_message: `Retry ${attempt + 1}/${RETRY_DELAYS_MS.length}: ${message}`.slice(
              0,
              2000,
            ),
          })
          .eq("id", next.id);

        await appendLog(
          supabase,
          input.planId,
          next.id,
          "warn",
          `Gemini indisponível (${attempt + 1}/${RETRY_DELAYS_MS.length}). Retry em ${delay / 1000}s.`,
        );
        await sleep(delay);
      }
    }

    if (!result) throw lastError ?? new Error("Builder sem resultado");

    await supabase
      .from("plan_tasks")
      .update({
        status: "done",
        error_message: null,
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
        retrying: statusList.filter((s) => s === "retrying").length,
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

    await appendLog(supabase, input.planId, next.id, "error", message);

    const { data: afterFailure } = await supabase
      .from("plan_tasks")
      .select(
        "id, plan_id, task_key, type, title, instruction, path, depends_on, status, sort_order",
      )
      .eq("plan_id", input.planId)
      .order("sort_order", { ascending: true });
    const afterList = (afterFailure ?? []) as DbTask[];
    const canContinue = hasEligibleQueuedTask(afterList);

    if (!canContinue) {
      await supabase
        .from("plans")
        .update({ status: "error", error_message: message.slice(0, 2000) })
        .eq("id", input.planId);
    }

    return {
      done: !canContinue,
      failed: !canContinue,
      currentTaskKey: next.task_key,
      processed: true,
      message: canContinue
        ? `${message}\nContinuando tasks independentes.`
        : message,
      counts: counts(afterList),
    };
  }
}
