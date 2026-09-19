import { AssetVisionInput, AssetVisionProvider, AssetVisionResult } from "./vision-types";

export class OpenAiVisionProvider implements AssetVisionProvider {
  async validateAsset(input: AssetVisionInput): Promise<AssetVisionResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    const base64Data = input.imageBytes.toString("base64");
    const dataUri = `data:${input.mimeType};base64,${base64Data}`;

    const promptText = `Você é um avaliador visual profissional.
Sua tarefa é analisar uma imagem candidata e compará-la rigidamente com a requisição de asset (Asset Request).
Analise SOMENTE o que é visualmente verificável na imagem.
NÃO invente metadata nem opine sobre formato/tamanho ou licença.

ASSET REQUEST:
- Purpose: ${input.assetRequest.purpose || "Não especificado"}
- Subject: ${input.assetRequest.subject || "Não especificado"}
- Description: ${input.assetRequest.description || "Não especificado"}
- Composition: ${input.assetRequest.composition || "Não especificado"}
- Orientation: ${input.assetRequest.orientation || "Não especificado"}
- Style: ${input.assetRequest.style || "Não especificado"}
- Quality: ${input.assetRequest.quality_requirements || "Não especificado"}
- Context: ${input.assetRequest.context_usage || "Não especificado"}

Retorne ESTRITAMENTE o seguinte JSON (tipos numéricos entre 0.0 e 1.0, e booleanos):
{
  "relevance_score": number, // O quão relevante a imagem é para o subject?
  "quality_score": number, // A qualidade estética bate com o exigido?
  "composition_check": boolean, // A composição visual atende os requisitos?
  "visual_coherence": boolean, // Coerência visual de estilo
  "purpose_adherence": boolean, // Atende ao purpose e contexto?
  "rejection_reason": string | null // Caso falhe, justifique objetivamente.
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              {
                type: "image_url",
                image_url: {
                  url: dataUri,
                  detail: "low" // Low detail to save tokens, it's enough for basic validation
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Falha no VisionProvider: ${errText}`);
    }

    const data = await response.json();
    const rawResult = data.choices[0]?.message?.content;

    if (!rawResult) {
      throw new Error("Resposta inválida do VisionProvider (vazio)");
    }

    try {
      const parsed = JSON.parse(rawResult);
      return {
        relevance_score: parsed.relevance_score ?? null,
        quality_score: parsed.quality_score ?? null,
        composition_check: parsed.composition_check ?? null,
        visual_coherence: parsed.visual_coherence ?? null,
        purpose_adherence: parsed.purpose_adherence ?? null,
        rejection_reason: parsed.rejection_reason || undefined
      };
    } catch (e: any) {
      throw new Error("JSON inválido retornado pelo VisionProvider: " + e.message);
    }
  }
}
