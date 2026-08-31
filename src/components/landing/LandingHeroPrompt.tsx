"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loginForPrompt,
  projectCreatePath,
  signupForPrompt,
} from "@/lib/auth/paths";

type Props = {
  /** Usuário já autenticado (não deveria aparecer na landing, mas suportado). */
  isAuthenticated?: boolean;
};

export function LandingHeroPrompt({ isAuthenticated = false }: Props) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = prompt.trim();

    if (isAuthenticated) {
      router.push(value.length >= 3 ? projectCreatePath(value) : "/projects#prompt");
      return;
    }

    if (value.length >= 3) {
      router.push(signupForPrompt(value));
      return;
    }

    router.push("/signup");
  }

  const loginHref =
    prompt.trim().length >= 3 ? loginForPrompt(prompt) : "/login";

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="x09-hero-prompt">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Ex.: Landing page premium para uma imobiliária de alto padrão em Florianópolis…"
          className="x09-hero-prompt-input"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            Descreva em uma frase. A IA planeja, constrói e publica.
          </p>
          <button type="submit" className="x09-button-primary shrink-0">
            Começar grátis
            <span aria-hidden className="ml-1.5">
              →
            </span>
          </button>
        </div>
      </form>
      <p className="text-sm text-zinc-500">
        Já tem conta?{" "}
        <a
          href={loginHref}
          className="font-medium text-violet-300 hover:text-violet-200"
        >
          Entrar
        </a>
      </p>
    </div>
  );
}
