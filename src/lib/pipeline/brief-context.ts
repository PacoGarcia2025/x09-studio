/** Contexto do brief do cliente para prompts de geração/edição. */

const GENERIC_BRAND_RE =
  /\b(sua empresa|sua marca|empresa premium|acme|exemplo ltda|marca exemplo|company name|lorem ipsum|seu app|nome da empresa)\b/i;

const DEFAULT_VIOLET_RE = /#7C3AED|#C026D3|violet-600|fuchsia-500|from-violet-600/i;

/** Extrai tokens únicos do brief (nomes, números, cidades) para validação. */
export function extractBriefTokens(brief: string): string[] {
  const tokens = new Set<string>();
  const text = brief.trim();
  if (!text) return [];

  // CRECI, telefones, CNPJ-like
  for (const m of text.matchAll(
    /\b(?:CRECI\s*)?[\d./-]{8,}\b|\(\d{2}\)\s*\d{4,5}-?\d{4}|\b\d{2}\s?\d{4,5}-?\d{4}\b/gi,
  )) {
    tokens.add(m[0].replace(/\s+/g, " ").trim());
  }

  // Palavras capitalizadas / nomes próprios (SGO Imób, Hortolândia)
  for (const m of text.matchAll(/\b[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][A-Za-záéíóúàâêôãõç0-9.-]{2,}\b/g)) {
    const w = m[0];
    if (/^(Crie|Site|Landing|Page|CRM|Dashboard|Login|Home|Verde|Premium|Moderno)$/i.test(w))
      continue;
    if (w.length >= 3) tokens.add(w);
  }

  // Nomes após "nome:", "empresa:"
  for (const m of text.matchAll(
    /(?:nome|empresa|marca|imobili[aá]ria|neg[oó]cio)\s*[:\-–]\s*([^\n,.;]{2,60})/gi,
  )) {
    tokens.add(m[1].trim());
  }

  return [...tokens].slice(0, 12);
}

export function containsGenericPlaceholder(content: string): boolean {
  return GENERIC_BRAND_RE.test(content);
}

/** Brief pediu paleta não-violeta mas o código usa violeta padrão. */
export function usesDefaultPaletteDespiteBrief(
  brief: string,
  content: string,
): boolean {
  const b = brief.toLowerCase();
  const askedCustomColor =
    /verde|oliva|olive|azul|blue|laranja|orange|vermelho|red|dourado|gold|marrom|brown|preto|black|bege|beige|terracota|emerald|teal|cyan|rose|amber|lime|indigo(?!go)/i.test(
      brief,
    ) || /paleta|cor principal|color palette|#[0-9a-f]{3,8}/i.test(brief);

  if (!askedCustomColor) return false;
  return DEFAULT_VIOLET_RE.test(content);
}

export function briefMissingFromContent(
  brief: string,
  content: string,
): string[] {
  const missing: string[] = [];
  const tokens = extractBriefTokens(brief);
  if (tokens.length === 0) return missing;

  const contentLower = content.toLowerCase();
  const matched = tokens.filter((t) =>
    contentLower.includes(t.toLowerCase()),
  );

  if (matched.length === 0 && tokens.length >= 2) {
    missing.push(
      `O brief cita "${tokens.slice(0, 3).join('", "')}" mas nenhum aparece na página`,
    );
  }

  if (containsGenericPlaceholder(content)) {
    missing.push('Textos genéricos ("Sua Empresa", "Lorem", etc.)');
  }

  if (usesDefaultPaletteDespiteBrief(brief, content)) {
    missing.push(
      "Paleta violeta/fúcsia padrão — o brief pediu outras cores",
    );
  }

  return missing;
}

/** Texto padrão para prompts — órgão fiscalizador é opcional e varia por segmento. */
export const REGULATORY_BODY_HINT =
  "registro profissional / órgão fiscalizador (ex.: CRECI para imobiliárias, OAB, CRM, CRC — omita se não constar no brief)";

export function formatBuilderContext(input: {
  projectName: string;
  briefPrompt?: string | null;
  taskInstruction?: string;
}): string {
  const parts = [`Nome do projeto: ${input.projectName}`];

  const brief = input.briefPrompt?.trim();
  if (brief) {
    parts.push(
      `Brief completo do cliente (OBRIGATÓRIO — use nome, cores, contatos, cidade, WhatsApp, e-mail EXATOS; ${REGULATORY_BODY_HINT}):\n${brief.slice(0, 2800)}`,
    );
  }

  if (input.taskInstruction?.trim()) {
    parts.push(`Instrução desta task:\n${input.taskInstruction.trim()}`);
  }

  parts.push(`Regras de conteúdo e visual:
- Marca: use o nome REAL da empresa do brief (nunca "Sua Empresa", "Marca", "Exemplo").
- Cores: siga EXCLUSIVAMENTE a paleta pedida no brief (nunca violeta/fúcsia genérico se o cliente pediu outra cor).
- Contato: inclua telefone, WhatsApp, e-mail, endereço e ${REGULATORY_BODY_HINT} somente se constarem no brief.
- Copy em português do Brasil, específica do negócio e da cidade/região mencionadas.`);

  return parts.join("\n\n");
}

export const EDIT_PATCH_RULES = `- Altere SÓ o necessário para atender o pedido.
- Devolva o conteúdo COMPLETO de cada arquivo modificado (não diff).
- Paths relativos ao projeto (ex: src/pages/HomePage.tsx).
- Máximo 8 arquivos.
- NÃO use Next.js, NÃO use AppShell/"Meu App".
- Mantenha exports (HomePage, LoginPage) e props de navegação se existirem.
- Textos em português do Brasil — use dados REAIS do brief (nome, cores, contatos).
- CRÍTICO: TSX válido — feche TODAS as tags JSX, strings e chaves. Nunca trunque no final.
- Paleta: respeite cores pedidas no brief/pedido (não reverta para violeta genérico).`;
