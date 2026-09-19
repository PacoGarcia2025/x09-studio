import {
  AssetGenerationProvider,
  AssetGenerationRequest,
  AssetGenerationResult,
} from "./generation-types";

export function normalizeDalle3Size(
  aspectRatio?: string,
  orientation?: string,
): "1024x1024" | "1024x1792" | "1792x1024" {
  // Exact aspect ratio matches
  if (aspectRatio === "1:1") return "1024x1024";
  if (aspectRatio === "16:9") return "1792x1024";
  if (aspectRatio === "9:16") return "1024x1792";
  
  // Fallback map for common ratios
  const ratioFallback: Record<string, "1792x1024" | "1024x1792" | "1024x1024"> = {
    "4:3": "1792x1024", // landscape
    "3:2": "1792x1024", // landscape
    "21:9": "1792x1024", // landscape
    "2:3": "1024x1792", // portrait
    "3:4": "1024x1792", // portrait
  };

  if (aspectRatio && ratioFallback[aspectRatio]) {
    return ratioFallback[aspectRatio];
  }

  // Fallback to orientation
  if (orientation === "landscape") return "1792x1024";
  if (orientation === "portrait") return "1024x1792";
  
  return "1024x1024"; // default to square
}

export class OpenAiImageProvider implements AssetGenerationProvider {
  id = "openai-image";

  async generateImage(
    request: AssetGenerationRequest,
  ): Promise<AssetGenerationResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        provider: this.id,
        error: "OPENAI_API_KEY não configurada",
      };
    }

    const size = normalizeDalle3Size(request.aspectRatio, request.orientation);
    const quality = request.quality === "hd" ? "hd" : "standard";

    try {
      const response = await fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: request.prompt,
            n: 1,
            size,
            quality,
            response_format: "b64_json",
          }),
        },
      );

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        return {
          ok: false,
          provider: this.id,
          error: `Erro HTTP ${response.status}: OpenAI falhou em gerar a imagem. ${
            response.status === 400 && errBody.includes("content_policy_violation")
              ? "Violação de política de conteúdo."
              : ""
          }`,
        };
      }

      const data = await response.json();
      const b64Json = data?.data?.[0]?.b64_json;

      if (!b64Json || typeof b64Json !== "string") {
        return {
          ok: false,
          provider: this.id,
          error: "Resposta inválida: b64_json ausente",
        };
      }

      return {
        ok: true,
        provider: this.id,
        base64Data: b64Json,
        mimeType: "image/png",
      };
    } catch (e: any) {
      return {
        ok: false,
        provider: this.id,
        error: `Erro de rede/timeout ao gerar imagem.`,
      };
    }
  }
}
