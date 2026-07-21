import { useState, type FormEvent } from "react";
import {
  getPropertyById,
  formatPriceBRL,
  formatPriceShort,
} from "../lib/properties";
import {
  buildPropertyWhatsAppMessage,
  buildWhatsAppUrl,
} from "../lib/whatsapp";

type Props = {
  propertyId: string;
  onNavigateBack?: () => void;
  onNavigateListings?: () => void;
};

type SubmitState = "idle" | "loading" | "ok" | "error";

export function PropertyDetailPage({
  propertyId,
  onNavigateBack,
  onNavigateListings,
}: Props) {
  const property = getPropertyById(propertyId);
  const [visitDate, setVisitDate] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");

  if (!property) {
    return (
      <div className="p-8 text-center">
        <p>Imóvel não encontrado.</p>
        <button
          type="button"
          onClick={() => onNavigateListings?.()}
          className="mt-4 text-[#D4AF37]"
        >
          Ver catálogo
        </button>
      </div>
    );
  }

  const whatsappUrl = buildWhatsAppUrl(
    property.brokerPhone,
    buildPropertyWhatsAppMessage({
      title: property.title,
      id: property.id,
      priceLabel: formatPriceShort(property.price),
    }),
  );

  async function handleVisitSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitState("loading");
    setSubmitError("");

    try {
      const res = await fetch("/api/leads/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          propertyTitle: property.title,
          brokerName: property.brokerName,
          brokerEmail: property.brokerEmail,
          clientName,
          clientEmail,
          clientPhone,
          visitDate,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Não foi possível enviar o agendamento.");
      }
      setSubmitState("ok");
    } catch (err) {
      setSubmitState("error");
      setSubmitError(
        err instanceof Error ? err.message : "Erro ao enviar agendamento.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b bg-white px-6 py-4">
        <button
          type="button"
          onClick={() => onNavigateBack?.()}
          className="text-sm text-stone-600"
        >
          ← Voltar
        </button>
      </header>
      <main className="mx-auto grid max-w-5xl gap-8 p-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="font-serif text-3xl font-semibold">{property.title}</h1>
          <p className="mt-2 text-2xl font-semibold text-[#D4AF37]">
            {formatPriceBRL(property.price)}
          </p>
          <p className="mt-4 text-stone-600">{property.description}</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-md"
          >
            WhatsApp — mensagem pronta
          </a>
        </div>

        <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-stone-800">
            Agendar visita
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Corretor: {property.brokerName}
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleVisitSubmit}>
            <input
              required
              type="text"
              placeholder="Seu nome"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
            <input
              required
              type="email"
              placeholder="E-mail"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
            <input
              type="tel"
              placeholder="Telefone (opcional)"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
            <input
              required
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={submitState === "loading"}
              className="w-full rounded-full bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitState === "loading" ? "Enviando…" : "Confirmar visita"}
            </button>
            {submitState === "ok" && (
              <p className="text-xs text-emerald-600">
                Agendamento enviado! O corretor responderá em breve.
              </p>
            )}
            {submitState === "error" && (
              <p className="text-xs text-red-600">{submitError}</p>
            )}
          </form>
        </aside>
      </main>
    </div>
  );
}
