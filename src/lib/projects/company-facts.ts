export type CompanyFacts = {
  legalName?: string;
  /** Ex.: CRECI, OAB, CRM — vazio se não aplicável */
  regulatoryBody?: string;
  regulatoryNumber?: string;
  foundedYear?: string;
  cities?: string;
  services?: string;
  history?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  cnpj?: string;
  brandColors?: string;
};

export function emptyCompanyFacts(): CompanyFacts {
  return {};
}

export function parseCompanyFacts(raw: unknown): CompanyFacts {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const pick = (key: keyof CompanyFacts) => {
    const v = o[key];
    return typeof v === "string" ? v.trim() : undefined;
  };
  return {
    legalName: pick("legalName"),
    regulatoryBody: pick("regulatoryBody"),
    regulatoryNumber: pick("regulatoryNumber"),
    foundedYear: pick("foundedYear"),
    cities: pick("cities"),
    services: pick("services"),
    history: pick("history"),
    phone: pick("phone"),
    whatsapp: pick("whatsapp"),
    email: pick("email"),
    address: pick("address"),
    cnpj: pick("cnpj"),
    brandColors: pick("brandColors"),
  };
}

/** Texto injetado nos prompts quando o usuário preenche configurações. */
export function formatCompanyFactsBlock(facts: CompanyFacts): string {
  const lines: string[] = [];
  if (facts.legalName) lines.push(`Razão / marca: ${facts.legalName}`);
  if (facts.cnpj) lines.push(`CNPJ: ${facts.cnpj}`);
  if (facts.regulatoryBody && facts.regulatoryNumber) {
    lines.push(`${facts.regulatoryBody}: ${facts.regulatoryNumber}`);
  } else if (facts.regulatoryBody) {
    lines.push(`Órgão fiscalizador: ${facts.regulatoryBody}`);
  } else if (facts.regulatoryNumber) {
    lines.push(`Registro profissional: ${facts.regulatoryNumber}`);
  }
  if (facts.foundedYear) lines.push(`Fundação: ${facts.foundedYear}`);
  if (facts.cities) lines.push(`Cidades de atuação: ${facts.cities}`);
  if (facts.services) lines.push(`Serviços: ${facts.services}`);
  if (facts.history) lines.push(`História: ${facts.history.slice(0, 800)}`);
  if (facts.phone) lines.push(`Telefone: ${facts.phone}`);
  if (facts.whatsapp) lines.push(`WhatsApp: ${facts.whatsapp}`);
  if (facts.email) lines.push(`E-mail: ${facts.email}`);
  if (facts.address) lines.push(`Endereço: ${facts.address}`);
  if (facts.brandColors) lines.push(`Paleta de cores: ${facts.brandColors}`);
  if (lines.length === 0) return "";
  return `Dados cadastrados do cliente (use EXATOS no site):\n${lines.join("\n")}`;
}
