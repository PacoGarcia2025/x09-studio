"use server";

import { revalidatePath } from "next/cache";
import {
  type CompanyFacts,
  parseCompanyFacts,
} from "@/lib/projects/company-facts";
import { createClient } from "@/lib/supabase/server";

async function assertOwner(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" as const };

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, workspace_id, brief_prompt, company_facts")
    .eq("id", projectId)
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

  return { supabase, project, error: null };
}

export async function getProjectSettingsAction(projectId: string): Promise<
  | {
      ok: true;
      name: string;
      briefPrompt: string;
      companyFacts: CompanyFacts;
    }
  | { ok: false; error: string }
> {
  const gate = await assertOwner(projectId);
  if (gate.error || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  return {
    ok: true,
    name: gate.project.name,
    briefPrompt: gate.project.brief_prompt?.trim() ?? "",
    companyFacts: parseCompanyFacts(gate.project.company_facts),
  };
}

export async function updateProjectSettingsAction(
  projectId: string,
  input: {
    briefPrompt?: string;
    companyFacts: CompanyFacts;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertOwner(projectId);
  if (gate.error || !gate.supabase || !gate.project) {
    return { ok: false, error: gate.error ?? "Erro" };
  }

  const facts = input.companyFacts;
  const brief = input.briefPrompt?.trim() ?? "";

  const { error } = await gate.supabase
    .from("projects")
    .update({
      brief_prompt: brief || null,
      company_facts: facts,
    })
    .eq("id", projectId);

  if (error) {
    if (/company_facts/i.test(error.message)) {
      return {
        ok: false,
        error:
          "Coluna company_facts ainda não existe no banco. Rode a migration na VPS/Supabase.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);
  return { ok: true };
}
