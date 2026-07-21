import "server-only";

import {
  fileExists,
  readProjectFile,
} from "@/lib/projects/fs.server";
import { isWeakHomePage } from "@/lib/pipeline/task-content.server";
import { hasValidTsxSyntax } from "@/lib/pipeline/jsx-validate";

export type PublishReadiness = {
  ready: boolean;
  reason?: string;
};

/** Verifica se o app foi construído o suficiente para publicar. */
export async function getProjectPublishReadiness(
  projectId: string,
): Promise<PublishReadiness> {
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
    if (isWeakHomePage(home)) {
      return {
        ready: false,
        reason:
          "A landing ainda está incompleta. Conclua a geração (OK, construir app) e aguarde o preview carregar.",
      };
    }
  } catch {
    return {
      ready: false,
      reason: "Não foi possível ler os arquivos do projeto.",
    };
  }

  return { ready: true };
}
