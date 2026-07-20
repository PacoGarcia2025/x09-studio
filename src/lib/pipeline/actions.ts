"use server";

import { revalidatePath } from "next/cache";
import { formatLlmUserError } from "@/lib/llm/resilient";
import { getLlmProvider } from "@/lib/llm/provider";
import { runPlanner } from "@/lib/pipeline/planner.server";
import type { StudioPlan } from "@/lib/pipeline/plan-schema";
import { createClient } from "@/lib/supabase/server";

export type GeneratePlanResult =
  | {
      ok: true;
      planId: string;
      plan: StudioPlan;
      model: string;
    }
  | { ok: false; error: string };

async function assertProjectOwner(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, project: null, error: "Não autenticado" };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, slug, workspace_id, status, brief_prompt")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return { supabase, user, project: null, error: "Projeto não encontrado" };
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", project.workspace_id)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) {
    return { supabase, user, project: null, error: "Sem permissão" };
  }

  return { supabase, user, project, error: null };
}

export async function generatePlanAction(
  projectId: string,
  prompt: string,
): Promise<GeneratePlanResult> {
  const gate = await assertProjectOwner(projectId);
  if (gate.error || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro ao validar projeto" };
  }

  const trimmed = prompt.trim();
  if (trimmed.length < 3) {
    return { ok: false, error: "Escreva um prompt com pelo menos 3 caracteres." };
  }

  try {
    const provider = getLlmProvider("resilient-fast");
    const result = await runPlanner(provider, {
      prompt: trimmed,
      projectName: gate.project.name,
      projectSlug: gate.project.slug,
    });

    const { data: planRow, error: planError } = await gate.supabase
      .from("plans")
      .insert({
        project_id: projectId,
        prompt: trimmed,
        plan_json: result.plan,
        model: result.model,
        status: "ready",
      })
      .select("id")
      .single();

    if (planError || !planRow) {
      return {
        ok: false,
        error: planError?.message ?? "Falha ao salvar o plano",
      };
    }

    const taskRows = result.plan.tasks.map((task, index) => ({
      plan_id: planRow.id,
      task_key: task.id,
      type: task.type,
      title: task.title,
      instruction: task.instruction,
      path: task.path ?? null,
      depends_on: task.dependsOn ?? [],
      status: "queued" as const,
      sort_order: index,
    }));

    const { error: tasksError } = await gate.supabase
      .from("plan_tasks")
      .insert(taskRows);

    if (tasksError) {
      return {
        ok: false,
        error: tasksError.message ?? "Falha ao salvar as tasks",
      };
    }

    // Guarda o prompt no projeto para reabrir o chat sem digitar de novo.
    const briefUpdate = await gate.supabase
      .from("projects")
      .update({ brief_prompt: trimmed, status: "generating" })
      .eq("id", projectId);

    if (briefUpdate.error && /brief_prompt/i.test(briefUpdate.error.message)) {
      await gate.supabase
        .from("projects")
        .update({ status: "generating" })
        .eq("id", projectId);
    }

    revalidatePath(`/projects/${projectId}`);

    return {
      ok: true,
      planId: planRow.id,
      plan: result.plan,
      model: result.model,
    };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      err.name === "ZodError" &&
      "issues" in err
    ) {
      const issues = err as { issues: Array<{ path: (string | number)[]; message: string }> };
      const detail = issues.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return {
        ok: false,
        error: `Plano inválido da IA (${detail})`,
      };
    }

    const message = formatLlmUserError(err);
    return { ok: false, error: message };
  }
}

export type StoredPlan = {
  id: string;
  prompt: string;
  plan: StudioPlan;
  model: string | null;
  created_at: string;
};

export async function getLatestPlan(
  projectId: string,
): Promise<StoredPlan | null> {
  const gate = await assertProjectOwner(projectId);
  if (gate.error || !gate.project) return null;

  const { data } = await gate.supabase
    .from("plans")
    .select("id, prompt, plan_json, model, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    prompt: data.prompt,
    plan: data.plan_json as StudioPlan,
    model: data.model,
    created_at: data.created_at,
  };
}

export type ChatTurnResult =
  | {
      ok: true;
      intent: "create";
      planId: string;
      plan: StudioPlan;
      model: string;
    }
  | {
      ok: true;
      intent: "edit";
      summary: string;
      paths: string[];
      model: string;
    }
  | {
      ok: true;
      intent: "ask";
      answer: string;
      model: string;
    }
  | { ok: false; error: string };

/**
 * Entrada única do chat: classifica intenção e executa create/edit/ask.
 */
export async function chatProjectAction(
  projectId: string,
  message: string,
): Promise<ChatTurnResult> {
  const gate = await assertProjectOwner(projectId);
  if (gate.error || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro ao validar projeto" };
  }

  const trimmed = message.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Escreva uma mensagem." };
  }

  try {
    const provider = getLlmProvider("resilient-fast");
    const latest = await getLatestPlan(projectId);
    const hasExistingApp =
      Boolean(latest) ||
      gate.project.status === "ready" ||
      gate.project.status === "published" ||
      gate.project.status === "generating";

    const { classifyChatIntent } = await import(
      "@/lib/pipeline/chat-intent.server"
    );
    const intent = await classifyChatIntent(provider, {
      message: trimmed,
      hasExistingApp,
      projectName: gate.project.name,
    });

    if (intent === "ask") {
      const brief =
        (gate.project as { brief_prompt?: string | null }).brief_prompt ??
        latest?.prompt ??
        "";
      const answer = await provider.complete({
        messages: [
          {
            role: "system",
            content: `Você é o assistente do X09 Studio. Responda em português, curto e útil, sobre o projeto do usuário. Não invente código longo. Projeto: ${gate.project.name}. Brief: ${brief.slice(0, 400)}`,
          },
          { role: "user", content: trimmed },
        ],
        temperature: 0.4,
        maxOutputTokens: 800,
      });
      return {
        ok: true,
        intent: "ask",
        answer: answer.text.trim(),
        model: answer.model,
      };
    }

    if (intent === "edit" && hasExistingApp) {
      const { applyChatEditPatch } = await import(
        "@/lib/pipeline/edit-patch.server"
      );
      const patch = await applyChatEditPatch(provider, {
        projectId,
        projectName: gate.project.name,
        briefPrompt:
          (gate.project as { brief_prompt?: string | null }).brief_prompt ??
          latest?.prompt,
        message: trimmed,
      });

      await gate.supabase
        .from("projects")
        .update({ status: "ready" })
        .eq("id", projectId);

      revalidatePath(`/projects/${projectId}`);
      return {
        ok: true,
        intent: "edit",
        summary: patch.summary,
        paths: patch.paths,
        model: patch.model,
      };
    }

    // create (ou edit sem app ainda)
    const created = await generatePlanAction(projectId, trimmed);
    if (!created.ok) return created;
    return {
      ok: true,
      intent: "create",
      planId: created.planId,
      plan: created.plan,
      model: created.model,
    };
  } catch (err) {
    return { ok: false, error: formatLlmUserError(err) };
  }
}
