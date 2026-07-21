import type { SkillQualityIssue, StudioSkill } from "@/lib/skills/types";

export const x09SeoPerformanceSkill: StudioSkill = {
  id: "x09-seo-performance",
  name: "SEO & Performance",
  alwaysOn: true,
  plannerRules: `
- Inclua title SEO (~55 chars) e meta description (~155 chars) nos critérios de aceite.
- pages[].sections deve citar hierarquia H1/H2 e CTA principal acima da dobra.
`.trim(),
  builderFileRules: `
SEO & Performance (Sandpack/Vite):
- HTML semântico: <header>, <main>, <section>, <footer>, <nav>.
- Um único <h1> por página; H2/H3 descritivos (não "Seção 1").
- Imagens: loading="lazy" quando usar <img>; alt descritivo em português.
- Links internos âncora (#servicos) com id nas seções.
- Evite bibliotecas pesadas além de framer-motion, lucide-react, recharts.
- NÃO importe fonts externas bloqueantes — use font-sans system stack.
`.trim(),
  homePageRules: `
SEO na HomePage:
- <h1> com proposta de valor + marca (palavras-chave naturais do brief).
- Subtítulo <p> funciona como meta description visível.
- Seções com id para navegação (#sobre, #servicos, #contato).
- Botões/CTAs com texto acionável (não "Clique aqui").
- Footer com NAP (nome, endereço, telefone) quando no brief.
`.trim(),
  loginPageRules: "",
  dashboardPageRules: `
- Títulos de página claros; tabelas com <th scope="col"> quando HTML tabular.
`.trim(),
  editRules: `
- Edições não devem remover h1 semântico nem ids de âncora usados no header.
- Mantenha lazy loading em novas imagens.
`.trim(),
  evaluateHome(home, brief) {
    const issues: SkillQualityIssue[] = [];

    const h1Count = (home.match(/<h1\b/gi) ?? []).length;
    if (h1Count !== 1) {
      issues.push({
        code: "seo_h1",
        message: `Home deve ter exatamente 1 <h1> (encontrados: ${h1Count})`,
        severity: "error",
        penalty: 12,
      });
    }

    if (!/<main\b|<header\b/i.test(home)) {
      issues.push({
        code: "seo_semantic",
        message: "Faltam tags semânticas (<header>, <main>)",
        severity: "error",
        penalty: 10,
      });
    }

    const h2Count = (home.match(/<h2\b/gi) ?? []).length;
    if (h2Count < 2) {
      issues.push({
        code: "seo_headings",
        message: "Poucos H2 — estrutura SEO fraca",
        severity: "warn",
        penalty: 8,
      });
    }

    if (/<img\b/i.test(home) && !/loading=["']lazy["']/i.test(home)) {
      issues.push({
        code: "perf_lazy",
        message: "Imagens sem loading=\"lazy\"",
        severity: "warn",
        penalty: 5,
      });
    }

    if (brief.trim() && !/<footer\b/i.test(home)) {
      issues.push({
        code: "seo_footer",
        message: "Landing premium deve ter <footer> com contato/NAP",
        severity: "warn",
        penalty: 8,
      });
    }

    return issues;
  },
};
