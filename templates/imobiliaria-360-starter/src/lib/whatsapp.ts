/** Monta link oficial wa.me com mensagem pré-formatada (zero API paga). */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(message.trim());
  return `https://wa.me/${digits}?text=${text}`;
}

export function buildPropertyWhatsAppMessage(input: {
  title: string;
  id: string;
  priceLabel?: string;
}): string {
  const price = input.priceLabel ? ` (${input.priceLabel})` : "";
  return `Olá, tenho interesse no imóvel ${input.title}${price} - Ref:${input.id}`;
}
