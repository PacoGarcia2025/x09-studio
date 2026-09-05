/** Copy visível ao utilizador — sem nomes de motores ou fornecedores. */
export function sanitizeUserFacingCopy(text: string): string {
  return text
    .replace(/https?:\/\/\S*(meshy|runpod)\S*/gi, "")
    .replace(/\bSTUDIO_ASSET_PAID_APIS\b/g, "API comercial")
    .replace(/\bSTUDIO_MESHY_[A-Z0-9_]*\b/g, "API comercial")
    .replace(/\bSTUDIO_RUNPOD_[A-Z0-9_]*\b/g, "GPU")
    .replace(/\bGPU\s+RunPod\b/gi, "GPU")
    .replace(/\bmeshy\b/gi, "geração comercial")
    .replace(/\btrellis\b/gi, "GPU")
    .replace(/\bhuggingface\b/gi, "GPU")
    .replace(/\brunpod\b/gi, "GPU")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}
