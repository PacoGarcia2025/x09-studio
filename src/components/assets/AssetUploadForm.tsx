"use client";

import { useActionState } from "react";
import { ASSET_KINDS } from "@/lib/assets/kinds";
import { uploadAssetAction } from "@/lib/assets/actions";
import type { AssetActionResult } from "@/lib/assets/types";

const initial: AssetActionResult | null = null;

const KIND_LABEL: Record<string, string> = {
  mesh: "Mesh / modelo",
  image: "Imagem",
  audio: "Áudio",
  video: "Vídeo",
  texture: "Textura",
  material: "Material",
  animation: "Animação",
  hdri: "HDRI",
  thumbnail: "Thumbnail",
  other: "Outro",
};

export function AssetUploadForm() {
  const [state, formAction, pending] = useActionState(uploadAssetAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="asset-file" className="text-sm text-zinc-400">
          Arquivo
        </label>
        <input
          id="asset-file"
          name="file"
          type="file"
          required
          disabled={pending}
          className="x09-input w-full rounded-2xl px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500/20 file:px-3 file:py-1.5 file:text-xs file:text-violet-100"
        />
        <p className="text-xs text-zinc-500">
          Até 24 MB. Imagem, áudio, vídeo, HDRI, mesh, textura. Sem execução de IA.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="asset-kind" className="text-sm text-zinc-400">
          Tipo na biblioteca
        </label>
        <select
          id="asset-kind"
          name="kind"
          defaultValue=""
          disabled={pending}
          className="x09-input w-full rounded-2xl px-4 py-3 text-sm"
        >
          <option value="">Detectar pela extensão</option>
          {ASSET_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABEL[kind] ?? kind}
            </option>
          ))}
        </select>
      </div>

      {state && !state.ok ? (
        <p className="text-sm text-rose-300">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-300">
          Arquivo na biblioteca. Job criado na fila (queued) — sem processamento.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="x09-button-primary rounded-2xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Adicionar à biblioteca"}
      </button>
    </form>
  );
}
