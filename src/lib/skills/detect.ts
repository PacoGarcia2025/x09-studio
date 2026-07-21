/** Portal imobiliário multi-página (catálogo, detalhe, CRM, admin). */
export function isImobiliaria360(prompt: string): boolean {
  const text = prompt.trim();
  if (!text) return false;

  const strong =
    /\b(portal imobili[aá]rio|imobili[aá]ria 360|360[°º]?|smart search|cat[aá]logo de im[oó]veis|listagem de im[oó]veis|corretor(es)?|carteira de im[oó]veis|vgv|creci|matterport|penthouse|im[oó]veis exclusivos)\b/i.test(
      text,
    );

  const combo =
    /\bimobili[aá]ria\b/i.test(text) &&
    /\b(crm|corretor|dashboard|listagem|cat[aá]logo|portal|aluguel|comprar|lan[cç]amentos|propriet[aá]rio|administrador)\b/i.test(
      text,
    );

  return strong || combo;
}

/** Visual claro de luxo (Sotheby's, off-white, ouro champagne). */
export function isLuxuryLight(prompt: string): boolean {
  return /\b(off[- ]?white|#FAFAFA|#fafafa|ouro|champagne|#D4AF37|bronze met[aá]lico|sotheby|pininfarina|minimalismo sofisticado|alto luxo|alto padr[aã]o|high[- ]?end|luxury|luxo|branco off|modo claro|light mode|playfair|cormorant)\b/i.test(
    prompt,
  );
}
