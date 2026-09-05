"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AssetThumb } from "@/components/assets/AssetThumb";
import {
  archiveAssetAction,
  enqueueLogoPlateAction,
  enqueueMeshGenerateAction,
  enqueueMeshRigAction,
  enqueueTextTo3dAction,
  uploadAssetAction,
} from "@/lib/assets/actions";
import { MESH_CREDIT_COST, MESH_CREDIT_COST_GAME_CHARACTER, MESH_CREDIT_COST_PREPARE_GAME } from "@/lib/assets/mesh-tiers";
import { sanitizeUserFacingCopy } from "@/lib/assets/user-facing";
import { drainAssetQueue } from "@/components/assets/drainAssetQueue";

const MeshTurntable = dynamic(
  () => import("@/components/assets/MeshTurntable").then((m) => m.MeshTurntable),
  { ssr: false },
);
const MeshPreviewDialog = dynamic(
  () =>
    import("@/components/assets/MeshTurntable").then((m) => m.MeshPreviewDialog),
  { ssr: false },
);

const BTN =
  "rounded-2xl px-4 py-2.5 text-sm font-medium text-violet-100 ring-1 ring-violet-400/30 hover:bg-violet-500/15 disabled:opacity-50";

export function GenerateStudio({
  commercialMesh,
}: {
  commercialMesh: boolean;
  gpuMesh?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [meshId, setMeshId] = useState<string | null>(null);
  const [meshName, setMeshName] = useState<string | null>(null);
  const [meshCanRig, setMeshCanRig] = useState(false);
  const [meshGameClips, setMeshGameClips] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const hasSession = Boolean(imageId || meshId || prompt);

  const resetSession = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setImageId(null);
    setImageName(null);
    setMeshId(null);
    setMeshName(null);
    setMeshCanRig(false);
    setMeshGameClips(false);
    setPrompt("");
    setMessage(null);
    setOk(null);
    setPreview(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const runJob = (
    fn: () => Promise<{ ok: true; assetId?: string; jobId?: string } | { ok: false; error: string }>,
    label: string,
    options?: { canRig?: boolean; gameClips?: boolean },
  ) => {
    if (busy) return;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    void (async () => {
      setBusy(true);
      setMessage(label);
      setOk(null);
      try {
        const result = await fn();
        if (abort.signal.aborted) return;
        if (!result.ok) {
          setOk(false);
          setMessage(result.error);
          return;
        }
        const drainError = await drainAssetQueue(
          result.jobId,
          (progress) => setMessage(progress),
          abort.signal,
        );
        if (abort.signal.aborted) return;
        if (drainError) {
          setOk(false);
          setMessage(drainError);
          return;
        }
        if (result.assetId) {
          setMeshId(result.assetId);
          setMeshName("objeto-3d.glb");
          setMeshCanRig(options?.canRig !== false);
          setMeshGameClips(options?.gameClips === true);
        }
        setOk(true);
        setMessage("Pronto. Também foi enviado para a Biblioteca.");
        router.refresh();
      } catch (err) {
        if (abort.signal.aborted) return;
        setOk(false);
        setMessage(err instanceof Error ? err.message : "Falha ao gerar.");
      } finally {
        if (abortRef.current === abort) {
          abortRef.current = null;
          setBusy(false);
        }
      }
    })();
  };

  const onUpload = (file: File | undefined) => {
    if (!file || busy) return;
    void (async () => {
      setBusy(true);
      setMessage("A enviar a imagem…");
      setOk(null);
      try {
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
        setMeshCanRig(false);
        setOk(true);
        setMessage("Imagem pronta. Escolha como gerar o 3D.");
        router.refresh();
      } catch (err) {
        setOk(false);
        setMessage(err instanceof Error ? err.message : "Falha ao enviar a imagem.");
      } finally {
        setBusy(false);
      }
    })();
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
        <p className="mt-2 text-xs text-zinc-600">
          Objeto 3D simples: foto de uma coisa parada (árvore, arma, cenário).
          Personagem para jogo: boneco que anda ou ataca.
        </p>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!imageId) {
                setOk(false);
                setMessage(
                  "O modo simples precisa de uma foto. Envie a imagem e tente de novo.",
                );
                return;
              }
              runJob(
                () => enqueueMeshGenerateAction(imageId, "gpu"),
                "A gerar o objeto 3D…",
              );
            }}
            className="x09-button-primary rounded-2xl px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {busy
              ? "Gerando…"
              : `Objeto 3D simples · ${MESH_CREDIT_COST.gpu} cr`}
          </button>
          {commercialMesh ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (imageId) {
                runJob(
                  () => enqueueMeshGenerateAction(imageId, "game"),
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
            className={BTN}
          >
            {busy
              ? "Gerando…"
              : `Objeto mais detalhado · ${MESH_CREDIT_COST.game} cr`}
          </button>
          ) : null}
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
          {commercialMesh ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (imageId) {
                  runJob(
                    () =>
                      enqueueMeshGenerateAction(imageId, "game", {
                        forGame: true,
                      }),
                    "A gerar o personagem para jogo…",
                    { canRig: false, gameClips: true },
                  );
                  return;
                }
                if (prompt.trim().length < 3) {
                  setOk(false);
                  setMessage(
                    "Envie uma foto de frente, em pé, ou descreva o personagem.",
                  );
                  return;
                }
                runJob(
                  () => enqueueTextTo3dAction(prompt, "game", { forGame: true }),
                  "A gerar o personagem para jogo…",
                  { canRig: false, gameClips: true },
                );
              }}
              className={BTN}
            >
              Personagem para jogo · {MESH_CREDIT_COST_GAME_CHARACTER} cr
            </button>
          ) : null}
          {commercialMesh && meshId && meshCanRig ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runJob(
                  () => enqueueMeshRigAction(meshId),
                  "A preparar o esqueleto para jogo…",
                  { canRig: false, gameClips: true },
                )
              }
              className={BTN}
            >
              Preparar este GLB para jogo · {MESH_CREDIT_COST_PREPARE_GAME} cr
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
                  { canRig: false },
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
              onClick={resetSession}
              className="rounded-xl px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-white/10 hover:text-white"
            >
              {busy ? "Cancelar" : "Gerar novo"}
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
                  {meshGameClips ? (
                    <>
                      <a
                        href={`/api/assets/${meshId}/file?clip=idle`}
                        download="idle.glb"
                        className="rounded-xl px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-white/10 hover:text-white"
                      >
                        Parado
                      </a>
                      <a
                        href={`/api/assets/${meshId}/file?clip=attack`}
                        download="attack.glb"
                        className="rounded-xl px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-white/10 hover:text-white"
                      >
                        Ataque
                      </a>
                    </>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!meshId || busy) return;
                      void (async () => {
                        setBusy(true);
                        try {
                          await archiveAssetAction(meshId);
                          setMeshId(null);
                          setMeshName(null);
                          router.refresh();
                        } finally {
                          setBusy(false);
                        }
                      })();
                    }}
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
