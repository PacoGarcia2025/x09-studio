import "server-only";

import {
  fileExists,
  readProjectFile,
} from "@/lib/projects/fs.server";
import { isWeakHomePage } from "@/lib/pipeline/task-content.server";
import { hasValidTsxSyntax } from "@/lib/pipeline/jsx-validate";
import { isImobiliaria360 } from "@/lib/skills/detect";
import { createClient } from "@/lib/supabase/server";

export type PublishReadiness = {
  ready: boolean;
  reason?: string;
};

async function readBrief(projectId: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select("brief_prompt")
      .eq("id", projectId)
      .maybeSingle();
    return data?.brief_prompt?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Verifica se o app foi construído o suficiente para publicar. */
export async function getProjectPublishReadiness(
  projectId: string,
): Promise<PublishReadiness> {
  const brief = await readBrief(projectId);
  const homePath = "src/pages/HomePage.tsx";
  if (!(await fileExists(projectId, homePath))) {
    return {
      ready: false,
      reason:
        "O app ainda não foi construído. Clique em «OK, construir app» no chat antes de publicar.",
    };
  }

  try {
    const home = await readProjectFile(projectId, homePath);
    if (!hasValidTsxSyntax(home, homePath)) {
      return {
        ready: false,
        reason:
          "HomePage.tsx tem erro de sintaxe (preview quebrado). Peça no chat: «corrija o erro de sintaxe na HomePage» ou reconstrua o app.",
      };
    }
    if (isWeakHomePage(home, brief)) {
      return {
        ready: false,
        reason:
          "A landing ainda está incompleta. Conclua a geração (OK, construir app) e aguarde o preview carregar.",
      };
    }

    if (isImobiliaria360(brief)) {
      const required = [
        "src/pages/ListingsPage.tsx",
        "src/pages/PropertyDetailPage.tsx",
        "src/lib/properties.ts",
      ];
      for (const path of required) {
        if (!(await fileExists(projectId, path))) {
          return {
            ready: false,
            reason: `Portal imobiliário incompleto: falta ${path.replace("src/", "")}. Reconstrua o app.`,
          };
        }
      }
    }
  } catch {
    return {
      ready: false,
      reason: "Não foi possível ler os arquivos do projeto.",
    };
  }

  return { ready: true };
}
