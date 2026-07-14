import { getLlmProvider } from "@/lib/llm/provider";
import type { VerifyIssue, VerifyReport } from "@/lib/pipeline/verify-schema";
import { verifyIssueSchema } from "@/lib/pipeline/verify-schema";
import { z } from "zod";

const aiEnrichmentSchema = z.object({
  summary: z.string().min(1).max(2000),
  enrichments: z
    .array(
      z.object({
        issueId: z.string(),
        suggestion: z.string().min(1).max(1000),
        confidence: z.number().min(0).max(1).optional(),
        fixDetail: z.string().max(1000).optional(),
      }),
    )
    .max(40)
    .default([]),
});

/**
 * IA só interpreta resultados das ferramentas — não descobre erros novos.
 * Se a API falhar, o relatório das tools permanece intacto.
 */
export async function enrichVerifyReportWithAi(
  report: VerifyReport,
): Promise<{ report: VerifyReport; model: string | null }> {
  if (report.issues.length === 0 && report.status === "passed") {
    return {
      report: {
        ...report,
        summary: "Projeto saudável: todos os checks passaram.",
      },
      model: null,
    };
  }

  const compactIssues = report.issues.slice(0, 30).map((i) => ({
    id: i.id,
    category: i.category,
    severity: i.severity,
    code: i.code,
    message: i.message,
    file: i.file ?? null,
    line: i.line ?? null,
    suggestion: i.suggestion,
    fixTarget: i.fixTarget ?? null,
  }));

  const traces = report.toolTraces.slice(0, 8).map((t) => ({
    category: t.category,
    command: t.command,
    exitCode: t.exitCode,
    outputTail: t.output.slice(-1500),
  }));

  try {
    const provider = getLlmProvider();
    const result = await provider.complete({
      temperature: 0.2,
      maxOutputTokens: 4096,
      messages: [
        {
          role: "system",
          content: [
            "Você é o analisador do Verify Engine do X09 Studio.",
            "Os erros JÁ foram detectados por ferramentas (tsc, eslint, vite, checks estáticos).",
            "NÃO invente novos erros. NÃO invente arquivos que não aparecem nas issues.",
            "Sua função: resumir a saúde do projeto e melhorar sugestões de correção.",
            "Responda APENAS JSON com shape:",
            '{ "summary": string, "enrichments": [{ "issueId", "suggestion", "confidence?", "fixDetail?" }] }',
            "confidence entre 0 e 1. Só enriqueça issueIds já listados.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            overallHint: report.status,
            categories: report.categories,
            issues: compactIssues,
            toolTraces: traces,
          }),
        },
      ],
    });

    const parsed = aiEnrichmentSchema.safeParse(JSON.parse(result.text));
    if (!parsed.success) {
      return {
        report: {
          ...report,
          summary:
            report.summary ||
            "Verify concluído (análise IA indisponível — relatório das tools mantido).",
          meta: { ...report.meta, analyzeModel: result.model },
        },
        model: result.model,
      };
    }

    const byId = new Map(parsed.data.enrichments.map((e) => [e.issueId, e]));
    const issues: VerifyIssue[] = report.issues.map((issue) => {
      const enrich = byId.get(issue.id);
      if (!enrich) return issue;

      const next: VerifyIssue = {
        ...issue,
        suggestion: enrich.suggestion || issue.suggestion,
        confidence: Math.min(
          issue.confidence,
          enrich.confidence ?? issue.confidence,
        ),
        source: issue.source === "ai" ? "ai" : issue.source,
        fixTarget: issue.fixTarget
          ? {
              ...issue.fixTarget,
              detail: enrich.fixDetail ?? issue.fixTarget.detail,
            }
          : issue.fixTarget,
      };
      // Mantém schema válido
      const check = verifyIssueSchema.safeParse(next);
      return check.success ? check.data : issue;
    });

    return {
      report: {
        ...report,
        summary: parsed.data.summary,
        issues,
        meta: { ...report.meta, analyzeModel: result.model },
      },
      model: result.model,
    };
  } catch {
    return {
      report: {
        ...report,
        summary:
          report.summary ||
          "Verify concluído sem enriquecimento IA (keys/API indisponíveis).",
      },
      model: null,
    };
  }
}
