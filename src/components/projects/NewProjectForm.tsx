"use client";

import { useActionState } from "react";
import { createProject, type ActionResult } from "@/lib/projects/actions";
import { slugify } from "@/lib/projects/types";
import { useState } from "react";

const initial: ActionResult | null = null;

export function NewProjectForm() {
  const [state, formAction, pending] = useActionState(createProject, initial);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [publishMode, setPublishMode] = useState<"studio" | "custom">("studio");

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <section className="x09-card rounded-[2rem] p-6">
          <div className="mb-5 flex items-center gap-3">
            <Step index="01" title="Briefing" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="name" className="text-sm text-zinc-400">
                Nome do projeto
              </label>
              <input
                id="name"
                name="name"
                required
                value={name}
                onChange={(e) => {
                  const v = e.target.value;
                  setName(v);
                  if (!slugTouched) setSlug(slugify(v));
                }}
                className="x09-input w-full rounded-2xl px-4 py-3 text-sm"
                placeholder="CRM Imobiliário"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm text-zinc-400">Descrição</label>
              <textarea
                rows={4}
                className="x09-input w-full resize-none rounded-2xl px-4 py-3 text-sm"
                placeholder="Descreva o objetivo, público e principais fluxos."
              />
            </div>

            <SelectLike label="Categoria" items={["SaaS", "Marketplace", "Portal", "Backoffice"]} />
            <SelectLike label="Stack" items={["React + Supabase", "Next.js", "Mobile-ready", "API-first"]} />
          </div>
        </section>

        <section className="x09-card rounded-[2rem] p-6">
          <div className="mb-5 flex items-center gap-3">
            <Step index="02" title="Publicação" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setPublishMode("studio")}
              className={`rounded-3xl border p-4 text-left transition ${
                publishMode === "studio"
                  ? "border-violet-400/50 bg-violet-500/15"
                  : "border-white/10 bg-white/[0.03] hover:border-violet-400/30"
              }`}
            >
              <p className="text-sm font-medium text-white">Usar subdomínio</p>
              <p className="mt-1 text-xs text-zinc-500">
                cliente.studio.x09.com.br
              </p>
            </button>
            <button
              type="button"
              onClick={() => setPublishMode("custom")}
              className={`rounded-3xl border p-4 text-left transition ${
                publishMode === "custom"
                  ? "border-violet-400/50 bg-violet-500/15"
                  : "border-white/10 bg-white/[0.03] hover:border-violet-400/30"
              }`}
            >
              <p className="text-sm font-medium text-white">Domínio próprio</p>
              <p className="mt-1 text-xs text-zinc-500">
                meusite.com.br · preparado
              </p>
            </button>
          </div>

          {publishMode === "studio" ? (
            <div className="mt-5 space-y-1.5">
              <label htmlFor="slug" className="text-sm text-zinc-400">
                Subdomínio de publish
              </label>
              <input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                className="x09-input w-full rounded-2xl px-4 py-3 text-sm"
                placeholder="crm-imobiliario"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              />
              <p className="text-xs text-zinc-500">
                https://{slug || "projeto"}.studio.x09.com.br
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <input type="hidden" name="slug" value={slug || slugify(name)} />
              <div className="space-y-1.5">
                <label className="text-sm text-zinc-400">Domínio próprio</label>
                <input
                  className="x09-input w-full rounded-2xl px-4 py-3 text-sm"
                  placeholder="www.meusite.com.br"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {["DNS", "Status", "SSL", "Publicar"].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <span className="text-xs text-zinc-500">{item}</span>
                    <p className="mt-2 text-xs text-amber-200">Em breve</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="x09-card h-fit rounded-[2rem] p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-300">
          Resumo
        </p>
        <div className="mt-5 space-y-4 text-sm">
          <SummaryRow label="Projeto" value={name || "Aguardando nome"} />
          <SummaryRow
            label="Publicação"
            value={
              publishMode === "studio"
                ? `${slug || "projeto"}.studio.x09.com.br`
                : "Domínio próprio (wizard)"
            }
          />
          <SummaryRow label="Pipeline" value="Planner → Builder → Verify" />
        </div>

        {state && !state.ok ? (
          <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="x09-button mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Criando…" : "Criar projeto"}
        </button>
      </aside>
    </form>
  );
}

function Step({ index, title }: { index: string; title: string }) {
  return (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/15 text-xs text-violet-200">
        {index}
      </span>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </>
  );
}

function SelectLike({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-zinc-400">{label}</label>
      <div className="grid gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-zinc-400 transition hover:border-violet-400/35 hover:text-zinc-200"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs text-zinc-600">{label}</p>
      <p className="mt-1 text-zinc-300">{value}</p>
    </div>
  );
}
