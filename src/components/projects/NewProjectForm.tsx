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

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
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
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
          placeholder="CRM Imobiliário"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="slug" className="text-sm text-zinc-400">
          Subdomínio de publish
        </label>
        <div className="flex items-center gap-2">
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
            placeholder="crm-imobiliario"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
        </div>
        <p className="text-xs text-zinc-500">
          https://{slug || "projeto"}.studio.x09.com.br
        </p>
      </div>

      {state && !state.ok ? (
        <p className="text-sm text-red-400">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-60"
      >
        {pending ? "Criando…" : "Criar projeto"}
      </button>
    </form>
  );
}
