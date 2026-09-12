import type {
  ModelRouteInput,
  TaskClassification,
  TaskComplexity,
  TaskType,
} from "@/lib/model-router/types";

const EDIT_HINTS = /\b(troca|trocar|muda|mudar|altera|alterar|ajusta|ajustar|corrige|corrigir|renomeia|renomear|adiciona|adicionar|remove|remover|texto|cor|bot[aã]o|titulo|t[aí]tulo|telefone|campo|formulario|form)\b/i;
const REPAIR_HINTS = /\b(corrija|corrigir|quebrado|quebra|erro|falha|bug|repair|reparo|conflito|bug)\b/i;
const ARCHITECTURE_HINTS = /\b(arquitetura|sistema completo|crm|agenda|financiamento|portal|imobili[aá]ria|multi.*modulo|modulo|refatore|refatorar)\b/i;
const GENERATION_HINTS = /\b(crie|criar|gerar|fa[cç]a|p[aá]gina|landing|dashboard|saas|site|app|home)\b/i;
const CONTENT_HINTS = /\b(resumo|copy|descri[cç][aã]o|conteudo|texto|headline|anuncio|banner|mensagem)\b/i;

export function classifyTask(request: string): TaskClassification {
  const value = (request ?? "").trim();
  const lower = value.toLowerCase();

  let taskType: TaskType = "unknown";
  if (REPAIR_HINTS.test(lower)) taskType = "repair";
  else if (ARCHITECTURE_HINTS.test(lower)) taskType = "architecture";
  else if (CONTENT_HINTS.test(lower)) taskType = "content";
  else if (GENERATION_HINTS.test(lower)) taskType = "generation";
  else if (EDIT_HINTS.test(lower)) taskType = "edit";

  let complexity: TaskComplexity = "simple";
  if (taskType === "repair" || ARCHITECTURE_HINTS.test(lower)) complexity = "critical";
  else if (taskType === "architecture") complexity = "complex";
  else if (taskType === "generation" && /\b(landing|dashboard|saas|crm|portal|p[aá]gina)\b/i.test(lower)) complexity = "medium";
  else if (taskType === "edit" && /\b(texto|cor|bot[aã]o|titulo|telefone)\b/i.test(lower)) complexity = "trivial";
  else if (taskType === "content") complexity = "simple";

  if (taskType === "unknown" && /\b(corrija|quebrado|erro|falha)\b/i.test(lower)) taskType = "repair";

  return {
    taskType,
    complexity,
    reason: `heurística local: ${taskType}/${complexity}`,
  };
}

export function inferTaskContext(input: ModelRouteInput): TaskClassification {
  const base = classifyTask(input.request);
  const explicitComplexity = input.complexity ?? base.complexity;
  const explicitType = input.taskType ?? base.taskType;

  return {
    taskType: explicitType,
    complexity: explicitComplexity,
    reason: `${base.reason}; preferência explícita aplicada`,
  };
}
