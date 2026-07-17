import type { GenerationPreference, ResolvedMode } from "./schemas";

const EDIT_HINTS =
  /\b(troca|trocar|muda|mudar|altera|alterar|ajusta|ajustar|corrige|corrigir|renomeia|renomear|adiciona|adicionar|remove|remover|tira|tirar|coloca|colocar|atualiza|atualizar|substitu[ií]|whatsapp|instagram|email|e-mail|logo|cor|cores|texto|t[ií]tulo|bot[aã]o|fonte|espa[cç]o|padding|margin|tamanho|icone|ícone)\b/i;

const PREMIUM_HINTS =
  /\b(premium|ag[eê]ncia|refaz(er)?\s+(com\s+)?qualidade|melhor\s+qualidade|vers[aã]o\s+final|cinematogr[aá]fico|nível\s+stripe|nível\s+linear)\b/i;

const CREATE_HINTS =
  /\b(cria|criar|gere|gerar|fa[cç]a|fazer|monte|montar|landing|p[aá]gina|site|home|homepage|from\s+scratch|do\s+zero|app|dashboard|crm|saas)\b/i;

export function resolveGenerationMode(
  prompt: string,
  ctx: {
    preference: GenerationPreference;
    hasExistingApp: boolean;
    forceRepair?: boolean;
  },
): ResolvedMode {
  if (ctx.forceRepair) return "repair";
  if (ctx.preference === "premium") return "premium";

  const text = prompt.trim();
  const short = text.length < 220;

  if (PREMIUM_HINTS.test(text)) return "premium";

  if (
    ctx.hasExistingApp &&
    short &&
    EDIT_HINTS.test(text) &&
    !CREATE_HINTS.test(text)
  ) {
    return "edit";
  }

  // Criação nova: premium (Claude) por padrão para qualidade Lovable
  if (!ctx.hasExistingApp || CREATE_HINTS.test(text)) {
    return "premium";
  }

  return "fast";
}
