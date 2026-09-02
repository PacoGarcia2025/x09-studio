"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  enqueueLogoPlateAction,
  enqueueMeshGenerateAction,
  enqueueRetextureAction,
  enqueueTextTo3dAction,
} from "@/lib/assets/actions";
import { MESH_CREDIT_COST, type MeshTier } from "@/lib/assets/mesh-tiers";
import { logoThicknessFromLevel } from "@/lib/capability-router/providers/logo-plate-thickness";
import type { AssetActionResult } from "@/lib/assets/types";
import { sanitizeUserFacingCopy } from "@/lib/assets/user-facing";

const ACTION_BTN =
  "w-full rounded-xl px-3 py-1.5 text-xs text-violet-200 ring-1 ring-violet-400/25 hover:bg-violet-500/10 disabled:opacity-50";

function Feedback({
  ok,
  text,
}: {
  ok: boolean | null;
  text: string | null;
}) {
  if (!text) return null;
  const showBuyCredits = !ok && /créditos insuficientes/i.test(text);
  return (
    <p
      className={`text-[12px] leading-5 ${
        ok ? "text-emerald-200" : "text-rose-300"
      }`}
    >
      {sanitizeUserFacingCopy(text)}
      {showBuyCredits ? (
        <>
          {" "}
          <a href="/billing" className="underline underline-offset-2">
            Compre créditos aqui
          </a>
          .
        </>
      ) : null}
    </p>
  );
}

function useAssetEnqueue() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const run = (fn: () => Promise<AssetActionResult>) =>
    start(async () => {
      try {
        const result = await fn();
        setOk(result.ok);
        setMessage(
          result.ok
            ? "Na lista à direita — use «Processar próximo job»."
            : result.error,
        );
        if (result.ok) router.refresh();
      } catch (err) {
        setOk(false);
        setMessage(
          err instanceof Error ? err.message : "Falha ao enfileirar o job.",
        );
      }
    });

  return { pending, message, ok, run };
}

export function StubMeshGenerateControls({
  sourceAssetId,
  label,
  meshTier,
  enqueue,
}: {
  sourceAssetId?: string;
  label: string;
  meshTier?: MeshTier;
  enqueue?: (sourceAssetId?: string) => Promise<AssetActionResult>;
}) {
  const { pending, message, ok, run } = useAssetEnqueue();

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(() =>
            enqueue
              ? enqueue(sourceAssetId)
              : enqueueMeshGenerateAction(sourceAssetId, meshTier ?? "gpu"),
          )
        }
        className={ACTION_BTN}
      >
        {pending ? "Enfileirando…" : label}
      </button>
      <Feedback ok={ok} text={message} />
    </div>
  );
}

export function ImageMeshActions({
  sourceAssetId,
  gpuMesh,
  commercialMesh,
}: {
  sourceAssetId: string;
  gpuMesh: boolean;
  commercialMesh: boolean;
}) {
  const { pending, message, ok, run } = useAssetEnqueue();
  const [level, setLevel] = useState(4);
  const thickness = logoThicknessFromLevel(level);

  return (
    <div className="w-full space-y-2 border-t border-white/8 pt-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => enqueueMeshGenerateAction(sourceAssetId, "gpu"))
          }
          className={ACTION_BTN}
        >
          {pending
            ? "…"
            : gpuMesh
              ? `Objeto 3D · ${MESH_CREDIT_COST.gpu} cr`
              : "Objeto 3D"}
        </button>
        {commercialMesh ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => enqueueMeshGenerateAction(sourceAssetId, "game"))
              }
              className={ACTION_BTN}
            >
              {pending
                ? "…"
                : `Comercial · ${MESH_CREDIT_COST.game} cr`}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => enqueueMeshGenerateAction(sourceAssetId, "flagship"))
              }
              className={ACTION_BTN}
            >
              {pending
                ? "…"
                : `Alta qualidade · ${MESH_CREDIT_COST.flagship} cr`}
            </button>
          </>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => enqueueLogoPlateAction(sourceAssetId, thickness))
          }
          className={ACTION_BTN}
        >
          {pending ? "…" : `Logo · ${MESH_CREDIT_COST.logo} cr`}
        </button>
      </div>
      <label className="flex max-w-xs flex-col gap-0.5 text-[10px] text-zinc-500">
        <span className="flex justify-between gap-2">
          <span>Grossura do logo</span>
          <span className="tabular-nums text-zinc-400">
            {level <= 3 ? "fina" : level <= 7 ? "média" : "grossa"}
          </span>
        </span>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={level}
          disabled={pending}
          onChange={(e) => setLevel(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-violet-400"
          aria-label="Grossura da placa do logo"
        />
      </label>
      <Feedback ok={ok} text={message} />
    </div>
  );
}

export function RetextureControls({ sourceAssetId }: { sourceAssetId: string }) {
  const { pending, message, ok, run } = useAssetEnqueue();
  const [prompt, setPrompt] = useState("");

  return (
    <div className="w-full space-y-2 border-t border-white/8 pt-3">
      <label className="block text-[10px] uppercase tracking-[0.16em] text-zinc-500">
        Retextura
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <input
          type="text"
          value={prompt}
          maxLength={800}
          disabled={pending}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex.: metal pintado, madeira clara, camuflagem…"
          className="min-w-0 flex-1 rounded-xl bg-white/[0.04] px-3 py-1.5 text-xs text-white outline-none ring-1 ring-white/10 placeholder:text-zinc-600 focus:ring-violet-400/40"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => enqueueRetextureAction(sourceAssetId, prompt))
          }
          className={`${ACTION_BTN} sm:w-auto sm:shrink-0`}
        >
          {pending
            ? "Enfileirando…"
            : `Retextura · ${MESH_CREDIT_COST.retexture} cr`}
        </button>
      </div>
      <Feedback ok={ok} text={message} />
    </div>
  );
}

export function TextTo3dForm() {
  const { pending, message, ok, run } = useAssetEnqueue();
  const [prompt, setPrompt] = useState("");

  const submit = (tier: "game" | "flagship") => {
    if (prompt.trim().length < 3) {
      return run(async () => ({
        ok: false,
        error: "Descreva o objeto (mínimo 3 caracteres).",
      }));
    }
    return run(() => enqueueTextTo3dAction(prompt, tier));
  };

  return (
    <div className="space-y-3">
      <textarea
        value={prompt}
        maxLength={800}
        disabled={pending}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="Ex.: carro desportivo vermelho, volume fechado para jogo"
        className="w-full resize-y rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white outline-none ring-1 ring-white/10 placeholder:text-zinc-600 focus:ring-violet-400/40"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit("game")}
          className={ACTION_BTN}
        >
          {pending
            ? "Enfileirando…"
            : `Texto → 3D · ${MESH_CREDIT_COST.game} cr`}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit("flagship")}
          className={ACTION_BTN}
        >
          {pending
            ? "Enfileirando…"
            : `Texto HQ · ${MESH_CREDIT_COST.flagship} cr`}
        </button>
      </div>
      <Feedback ok={ok} text={message} />
    </div>
  );
}

export function LogoPlateControls({
  sourceAssetId,
}: {
  sourceAssetId: string;
}) {
  const { pending, message, ok, run } = useAssetEnqueue();
  const [level, setLevel] = useState(4);
  const thickness = logoThicknessFromLevel(level);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(() => enqueueLogoPlateAction(sourceAssetId, thickness))
        }
        className={ACTION_BTN}
      >
        {pending
          ? "Enfileirando…"
          : `Gerar logo · ${MESH_CREDIT_COST.logo} cr`}
      </button>
      <label className="flex flex-col gap-0.5 text-[10px] text-zinc-500">
        <span className="flex justify-between gap-2">
          <span>Grossura</span>
          <span className="tabular-nums text-zinc-400">
            {level <= 3 ? "fina" : level <= 7 ? "média" : "grossa"}
          </span>
        </span>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={level}
          disabled={pending}
          onChange={(e) => setLevel(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-violet-400"
          aria-label="Grossura da placa do logo"
        />
      </label>
      <Feedback ok={ok} text={message} />
    </div>
  );
}
