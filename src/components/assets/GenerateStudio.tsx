"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AssetThumb } from "@/components/assets/AssetThumb";
import { MeshPreviewDialog, MeshTurntable } from "@/components/assets/MeshTurntable";
import {
  archiveAssetAction,
  enqueueLogoPlateAction,
  enqueueMeshGenerateAction,
  enqueueTextTo3dAction,
  uploadAssetAction,
} from "@/lib/assets/actions";
import { MESH_CREDIT_COST } from "@/lib/assets/mesh-tiers";
import { sanitizeUserFacingCopy } from "@/lib/assets/user-facing";

const BTN =
  "rounded-2xl px-4 py-2.5 text-sm font-medium text-violet-100 ring-1 ring-violet-400/30 hover:bg-violet-500/15 disabled:opacity-50";

type TickPayload = {
  ok?: boolean;
  error?: string;
  processed?: boolean;
  done?: boolean;
  status?: string | null;
  message?: string;
  watch?: {
    status: string;
    error_message: string | null;
  } | null;
};

async function drainQueue(
  jobId: string | undefined,
  onProgress?: (message: string) => void,
) {
  for (let i = 0; i < 360; i += 1) {
    const response = await fetch("/api/assets/queue/tick", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobId ? { jobId } : {}),
    });
    const text = await response.text();
    let tick: TickPayload;
    try {
      tick = JSON.parse(text) as TickPayload;
    } catch {
      return "O servidor cortou a geração. Tente de novo — o objeto pode aparecer na Biblioteca.";
    }
    if (!response.ok || tick.ok === false) {
      return tick.error || "Não foi possível avançar a geração.";
    }

    const status = tick.watch?.status ?? tick.status;
    const message =
      tick.watch?.error_message ||
      tick.message ||
      "A gerar o objeto 3D…";
    if (status === "failed" || status === "skipped" || status === "cancelled") {
      return message;
    }
    if (jobId ? status === "done" : tick.done) {
      return null;
    }
    onProgress?.(sanitizeUserFacingCopy(message));
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  return "Ainda a gerar. Abra a Biblioteca daqui a pouco — o arquivo entra sozinho.";
}

export function GenerateStudio({
  commercialMesh,
}: {
  commercialMesh: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [prompt, setPrompt] = useState("");
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [meshId, setMeshId] = useState<string | null>(null);
  const [meshName, setMeshName] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const busy = pending;
  const hasSession = Boolean(imageId || meshId || prompt);

  const resetSession = () => {
    setImageId(null);
    setImageName(null);
    setMeshId(null);
    setMeshName(null);
    setPrompt("");
    setMessage(null);
    setOk(null);
    setPreview(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const runJob = (
    fn: () => Promise<{ ok: true; assetId?: string } | { ok: false; error: string }>,
    label: string,
  ) =>
    start(async () => {
      setMessage(label);
      setOk(null);
      try {
        const result = await fn();
        if (!result.ok) {
          setOk(false);
          setMessage(result.error);
          return;
        }
        const drainError = await drainQueue(result.jobId, (progress) => {
          setMessage(progress);
        });
        if (drainError) {
          setOk(false);
          setMessage(drainError);
          return;
        }
        if (result.assetId) {
          setMeshId(result.assetId);
          setMeshName("objeto-3d.glb");
        }
        setOk(true);
        setMessage("Pronto. Também foi enviado para a Biblioteca.");
        router.refresh();
      } catch (err) {
        setOk(false);
        setMessage(err instanceof Error ? err.message : "Falha ao gerar.");
      }
    });

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    start(async () => {
      setMessage("A enviar a imagem…");
      setOk(null);
      const data = new FormData();
      data.set("file", file);
      data.set("kind", "image");
      const result = await uploadAssetAction(null, data);
      if (!result.ok) {
        setOk(false);
        setMessage(result.error);
        return;
      }
      setImageId(result.assetId ?? null);
      setImageName(file.name);
      setMeshId(null);
      setMeshName(null);
      setOk(true);
      setMessage("Imagem pronta. Escolha como gerar o 3D.");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
      <section className="x09-card rounded-[1.75rem] p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Gerar objeto 3D
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">
          Foto ou texto, um de cada vez
        </h2>
        <p className="mt-1 mb-5 text-sm leading-6 text-zinc-500">
          A imagem e o GLB vão automaticamente para a Biblioteca. Aqui fica
          só o trabalho da vez.
        </p>

        <label className="block text-sm text-zinc-400">Foto de referência</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(e) => onUpload(e.target.files?.[0])}
          className="x09-input mt-1.5 w-full rounded-2xl px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500/20 file:px-3 file:py-1.5 file:text-xs file:text-violet-100"
        />

        <label className="mt-5 block text-sm text-zinc-400">
          Ou descreva o objeto
        </label>
        <textarea
          value={prompt}
          maxLength={800}
          disabled={busy}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Ex.: carro esportivo vermelho, volume fechado para jogo"
          className="mt-1.5 w-full resize-y rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-zinc-600 focus:ring-violet-400/40"
        />
        {!commercialMesh ? (
          <p className="mt-2 text-xs text-zinc-600">
            Texto → 3D usa a geração comercial. Se o botão falhar, a API 3D
            ainda não está ligada neste servidor.
          </p>
        ) : null}

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (imageId) {
                runJob(
                  () =>
                    enqueueMeshGenerateAction(
                      imageId,
                      commercialMesh ? "game" : "gpu",
                    ),
                  "A gerar o objeto 3D…",
                );
                return;
              }
              if (prompt.trim().length < 3) {
                setOk(false);
                setMessage("Envie uma foto ou descreva o objeto.");
                return;
              }
              runJob(
                () => enqueueTextTo3dAction(prompt, "game"),
                "A gerar a partir do texto…",
              );
            }}
            className="x09-button-primary rounded-2xl px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {busy
              ? "Gerando…"
              : `Gerar 3D · ${commercialMesh ? MESH_CREDIT_COST.game : MESH_CREDIT_COST.gpu} cr`}
          </button>
          {commercialMesh ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (imageId) {
                  runJob(
                    () => enqueueMeshGenerateAction(imageId, "flagship"),
                    "A gerar em alta qualidade…",
                  );
                  return;
                }
                if (prompt.trim().length < 3) {
                  setOk(false);
                  setMessage("Envie uma foto ou descreva o objeto.");
                  return;
                }
                runJob(
                  () => enqueueTextTo3dAction(prompt, "flagship"),
                  "A gerar em alta qualidade…",
                );
              }}
              className={BTN}
            >
              Alta qualidade · {MESH_CREDIT_COST.flagship} cr
            </button>
          ) : null}
          {imageId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runJob(
                  () => enqueueLogoPlateAction(imageId),
                  "A gerar a placa do logo…",
                )
              }
              className={BTN}
            >
              Logo a partir da foto · {MESH_CREDIT_COST.logo} cr
            </button>
          ) : null}
        </div>

        {message ? (
          <p
            className={`mt-4 text-sm leading-6 ${
              ok === false ? "text-rose-300" : "text-zinc-300"
            }`}
          >
            {sanitizeUserFacingCopy(message)}
          </p>
        ) : null}
      </section>

      <section className="x09-card flex min-h-[28rem] flex-col rounded-[1.75rem] p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Desta vez
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Preview e ações
            </h2>
          </div>
          {hasSession ? (
            <button
              type="button"
              disabled={busy}
              onClick={resetSession}
              className="rounded-xl px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-white/10 hover:text-white disabled:opacity-50"
            >
              Gerar novo
            </button>
          ) : null}
        </div>

        {!imageId && !meshId && !busy ? (
          <p className="m-auto max-w-sm text-center text-sm leading-6 text-zinc-500">
            Envie uma foto ou descreva o objeto. O resultado aparece aqui —
            visualizar, baixar ou apagar. A Biblioteca guarda o histórico.
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
            {imageId ? (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                  Foto
                </p>
                <AssetThumb
                  assetId={imageId}
                  kind="image"
                  className="h-48 w-full"
                />
                <p className="truncate text-xs text-zinc-500">{imageName}</p>
              </div>
            ) : null}
            {meshId ? (
              <div className="flex min-h-[16rem] flex-col gap-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                  Objeto 3D
                </p>
                <div className="relative min-h-[16rem] flex-1 overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10">
                  <MeshTurntable assetId={meshId} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPreview(true)}
                    className="rounded-xl px-3 py-1.5 text-xs text-sky-200 ring-1 ring-sky-400/25 hover:bg-sky-500/10"
                  >
                    Visualizar
                  </button>
                  <a
                    href={`/api/assets/${meshId}/file`}
                    download={meshName ?? "objeto.glb"}
                    className="rounded-xl px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-white/10 hover:text-white"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      start(async () => {
                        if (!meshId) return;
                        await archiveAssetAction(meshId);
                        setMeshId(null);
                        setMeshName(null);
                        router.refresh();
                      })
                    }
                    className="rounded-xl px-3 py-1.5 text-xs text-zinc-500 ring-1 ring-white/10 hover:text-rose-200"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ) : busy ? (
              <div className="grid min-h-[16rem] place-items-center rounded-2xl bg-black/40 px-4 text-center text-sm leading-6 text-zinc-400 ring-1 ring-white/10">
                A gerar o objeto 3D. Pode levar alguns minutos.
              </div>
            ) : null}
          </div>
        )}
      </section>

      {preview && meshId ? (
        <MeshPreviewDialog
          assetId={meshId}
          title={meshName ?? "Objeto 3D"}
          onClose={() => setPreview(false)}
        />
      ) : null}
    </div>
  );
}
