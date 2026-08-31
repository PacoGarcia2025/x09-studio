"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CompanyFacts } from "@/lib/projects/company-facts";
import { updateProjectSettingsAction } from "@/lib/projects/settings.actions";

const FIELDS: Array<{
  key: keyof CompanyFacts;
  label: string;
  placeholder?: string;
  rows?: number;
}> = [
  { key: "legalName", label: "Nome da empresa / marca" },
  { key: "cnpj", label: "CNPJ (opcional)" },
  {
    key: "regulatoryBody",
    label: "Órgão fiscalizador (opcional)",
    placeholder: "Ex.: CRECI, OAB, CRM — deixe em branco se não houver",
  },
  {
    key: "regulatoryNumber",
    label: "Nº registro profissional (opcional)",
    placeholder: "Ex.: CRECI 12345-J",
  },
  { key: "foundedYear", label: "Ano de fundação" },
  { key: "cities", label: "Cidades de atuação" },
  { key: "services", label: "Serviços prestados", rows: 3 },
  { key: "history", label: "História / sobre a empresa", rows: 4 },
  { key: "phone", label: "Telefone" },
  { key: "whatsapp", label: "WhatsApp (com DDD)" },
  { key: "email", label: "E-mail" },
  { key: "address", label: "Endereço completo" },
  { key: "brandColors", label: "Paleta de cores da marca" },
];

const fieldClass =
  "x09-input w-full rounded-xl px-3 py-2 text-sm caret-white placeholder:text-zinc-500";

export function ProjectSettingsForm({
  projectId,
  initialBrief,
  initialFacts,
}: {
  projectId: string;
  initialBrief: string;
  initialFacts: CompanyFacts;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [briefPrompt, setBriefPrompt] = useState(initialBrief);
  const [facts, setFacts] = useState<CompanyFacts>(initialFacts);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateProjectSettingsAction(projectId, {
        briefPrompt,
        companyFacts: facts,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Configurações salvas. Novas gerações usarão estes dados.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-16 text-zinc-100">
      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        <strong>Em breve:</strong> upload de logotipo, PDF institucional e anexos
        (imagem, PDF, áudio) no chat. Os campos abaixo já entram automaticamente
        em todo build e edição.
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Brief do projeto</h2>
        <textarea
          value={briefPrompt}
          onChange={(e) => setBriefPrompt(e.target.value)}
          rows={6}
          className={fieldClass}
          placeholder="Descreva o site, tom, páginas desejadas…"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">
          Dados da empresa
        </h2>
        {FIELDS.map(({ key, label, placeholder, rows = 1 }) => (
          <label key={key} className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">{label}</span>
            {rows > 1 ? (
              <textarea
                value={facts[key] ?? ""}
                onChange={(e) =>
                  setFacts((prev) => ({ ...prev, [key]: e.target.value }))
                }
                rows={rows}
                placeholder={placeholder}
                className={fieldClass}
              />
            ) : (
              <input
                value={facts[key] ?? ""}
                onChange={(e) =>
                  setFacts((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={placeholder}
                className={fieldClass}
              />
            )}
          </label>
        ))}
      </section>

      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="x09-button-primary px-6 py-2.5 text-sm disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar configurações"}
      </button>
    </div>
  );
}
