import {
  formatCompanyFactsBlock,
  parseCompanyFacts,
  type CompanyFacts,
} from "@/lib/projects/company-facts";

/** Brief + dados cadastrados (configurações do projeto). */
export function buildEffectiveBrief(
  briefPrompt?: string | null,
  companyFactsRaw?: unknown,
): string {
  const brief = briefPrompt?.trim() ?? "";
  const facts = formatCompanyFactsBlock(parseCompanyFacts(companyFactsRaw));
  return [brief, facts].filter(Boolean).join("\n\n");
}

export function mergeBriefWithCompanyFacts(
  briefPrompt: string,
  facts: CompanyFacts,
): string {
  return buildEffectiveBrief(briefPrompt, facts);
}
