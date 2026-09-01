import { isImobiliaria360 } from "@/lib/skills/detect";

export const HOME_PAGE_PATH = "src/pages/HomePage.tsx";

/** App com painel admin, área logada ou portal multi-página. */
export function needsAuthPanel(prompt: string): boolean {
  const text = prompt.trim();
  if (!text) return false;
  if (isImobiliaria360(text)) return true;

  return /\b(saas|crm|dashboard|painel|admin|backoffice|gest[aã]o|erp|intranet|portal do cliente|[aá]rea logada|login obrigat[oó]rio|painel do usu[aá]rio|painel administrativo|app com login|sistema de gest[aã]o)\b/i.test(
    text,
  );
}

export function isHomePageTaskPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return path.replace(/\\/g, "/") === HOME_PAGE_PATH;
}

export function homeReadyChatMessage(
  brief: string,
  authPanel: boolean,
): string {
  if (authPanel) {
    return [
      "A página principal está pronta — dá uma olhada no preview!",
      "",
      "Qual o próximo passo?",
      "• Responda **«adicionar login e painel»** para eu criar autenticação e área administrativa",
      "• Ou descreva ajustes na home (textos, cores, seções, imagens)",
    ].join("\n");
  }

  return [
    "Sua landing está no ar no preview — feita para encantar!",
    "",
    "O que fazemos agora? Sugestões:",
    "• Ajustar headline, cores ou imagens do hero",
    "• Refinar o formulário de captura de leads",
    "• Adicionar seção de depoimentos ou FAQ",
    "• **Publicar** quando estiver satisfeito",
    "",
    "Descreva no chat o que quer mudar.",
  ].join("\n");
}

export function matchesContinueFullBuild(message: string): boolean {
  return /\b(adicionar login|login e painel|criar login|[aá]rea logada|painel admin|continuar build completo|completar app)\b/i.test(
    message.trim(),
  );
}
