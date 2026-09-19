import { z } from "zod";
import type { LlmProvider } from "@/lib/llm/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const assetRequestSchema = z.object({
  purpose: z.string(),
  subject: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  composition: z.string().nullable().optional(),
  orientation: z.string().nullable().optional(),
  aspect_ratio: z.string().nullable().optional(),
  style: z.string().nullable().optional(),
  quality_requirements: z.string().nullable().optional(),
  context_usage: z.string().nullable().optional(),
  page_relation: z.string().nullable().optional(),
});

export const visualBriefSchema = z.object({
  business: z.string().nullable().optional(),
  niche: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  objective: z.string().nullable().optional(),
  visual_style: z.string().nullable().optional(),
  brand_identity: z.string().nullable().optional(),
  palette: z.record(z.string(), z.unknown()).nullable().optional(),
  typography: z.record(z.string(), z.unknown()).nullable().optional(),
  requests: z.array(assetRequestSchema).default([]),
});

export type VisualIntelligenceResult = {
  briefId: string;
  requestsCount: number;
};

const SYSTEM_PROMPT = `Você é o Diretor de Arte e Estrategista Visual do X09 Studio.
Sua missão é extrair a essência visual do pedido do usuário e planejar a direção de arte.

REGRAS:
- Responda APENAS com um objeto JSON válido.
- Não invente informações específicas (como nomes de empresa) se o usuário não forneceu, mas você deve inferir direções visuais fortes com base no nicho (ex: barbearia -> cores escuras, rústico).
- 'requests' são os Asset Requests. Pense em imagens necessárias para construir a landing page ou sistema.
- Para 'requests', não peça "imagem genérica de X". Especifique purpose (ex: hero, product, background), subject, composition, orientation (landscape, portrait, square), aspect_ratio (16:9, 1:1), style (fotográfico, ilustração 3D, premium) e context_usage (onde será usado na página).`;

export async function runVisualIntelligence(
  provider: LlmProvider,
  input: {
    projectId: string;
    workspaceId: string;
    prompt: string;
    supabase: SupabaseClient;
  }
): Promise<VisualIntelligenceResult> {
  const completion = await provider.complete({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Analise este pedido e defina o Brief Visual e os Assets necessários:\n\n${input.prompt}` },
    ],
    responseJsonSchema: { type: "object" },
    temperature: 0.4,
    maxOutputTokens: 2000,
  });

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(completion.text.trim());
  } catch (e) {
    const start = completion.text.indexOf("{");
    const end = completion.text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      rawJson = JSON.parse(completion.text.slice(start, end + 1));
    } else {
      throw new Error("Invalid JSON returned by LLM");
    }
  }

  const parsed = visualBriefSchema.parse(rawJson);

  // Reutilizar o brief existente para o projeto (se houver)
  const { data: existingBrief } = await input.supabase
    .from("visual_briefs")
    .select("id")
    .eq("project_id", input.projectId)
    .maybeSingle();

  let briefId: string;

  if (existingBrief) {
    briefId = existingBrief.id;
    const { error: updateError } = await input.supabase
      .from("visual_briefs")
      .update({
        business: parsed.business ?? null,
        niche: parsed.niche ?? null,
        audience: parsed.audience ?? null,
        objective: parsed.objective ?? null,
        visual_style: parsed.visual_style ?? null,
        brand_identity: parsed.brand_identity ?? null,
        palette: parsed.palette ?? null,
        typography: parsed.typography ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", briefId);
      
    if (updateError) throw new Error(`Brief update failed: ${updateError.message}`);
    
    // Limpar os requests antigos deste brief para recriar
    await input.supabase.from("asset_requests").delete().eq("visual_brief_id", briefId);
  } else {
    const { data: newBrief, error: insertError } = await input.supabase
      .from("visual_briefs")
      .insert({
        workspace_id: input.workspaceId,
        project_id: input.projectId,
        business: parsed.business ?? null,
        niche: parsed.niche ?? null,
        audience: parsed.audience ?? null,
        objective: parsed.objective ?? null,
        visual_style: parsed.visual_style ?? null,
        brand_identity: parsed.brand_identity ?? null,
        palette: parsed.palette ?? null,
        typography: parsed.typography ?? null,
      })
      .select("id")
      .single();

    if (insertError || !newBrief) {
      throw new Error(`Brief insert failed: ${insertError?.message}`);
    }
    briefId = newBrief.id;
  }

  const requestRows = parsed.requests.map((req) => ({
    workspace_id: input.workspaceId,
    project_id: input.projectId,
    visual_brief_id: briefId,
    purpose: req.purpose,
    subject: req.subject ?? null,
    description: req.description ?? null,
    composition: req.composition ?? null,
    orientation: req.orientation ?? null,
    aspect_ratio: req.aspect_ratio ?? null,
    style: req.style ?? null,
    quality_requirements: req.quality_requirements ?? null,
    context_usage: req.context_usage ?? null,
    page_relation: req.page_relation ?? null,
    status: "pending",
  }));

  if (requestRows.length > 0) {
    const { error: reqError } = await input.supabase.from("asset_requests").insert(requestRows);
    if (reqError) {
      throw new Error(`Asset Requests insert failed: ${reqError.message}`);
    }
  }

  return {
    briefId,
    requestsCount: requestRows.length,
  };
}
