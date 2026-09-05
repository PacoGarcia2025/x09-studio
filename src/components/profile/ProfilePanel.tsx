"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  removeAvatarAction,
  updatePasswordAction,
  updateProfileAction,
  uploadAvatarAction,
} from "@/lib/profile/actions";
import type { StudioProfile } from "@/lib/profile/types";

const fieldClass =
  "x09-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm caret-white placeholder:text-zinc-500";

export function ProfilePanel({
  email,
  profile,
  avatarUrl,
  schemaReady,
}: {
  email: string;
  profile: StudioProfile;
  avatarUrl: string | null;
  schemaReady: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function flash(ok: boolean, text: string) {
    setError(ok ? null : text);
    setMessage(ok ? text : null);
  }

  return (
    <div className="space-y-6">
      {schemaReady ? null : (
        <p className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Nome já grava. Telefone, endereço e foto ligam depois de aplicar a
          atualização do banco no Supabase.
        </p>
      )}
      {error ? (
        <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      <section className="x09-card rounded-[1.75rem] p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white">Foto ou logo</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Aparece na barra lateral. PNG, JPG ou WEBP até 3 MB.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-sky-400 text-2xl font-semibold text-white ring-1 ring-white/15">
            {preview || avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview || avatarUrl || ""}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              (profile.fullName.trim().charAt(0) || email.charAt(0) || "U").toUpperCase()
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setPreview(URL.createObjectURL(file));
                const data = new FormData();
                data.set("avatar", file);
                start(async () => {
                  const result = await uploadAvatarAction(data);
                  if (!result.ok) {
                    flash(false, result.error);
                    return;
                  }
                  flash(true, "Foto atualizada.");
                  router.refresh();
                });
              }}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              className="x09-button-secondary px-4 py-2 text-sm disabled:opacity-50"
            >
              Enviar imagem
            </button>
            {avatarUrl ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  start(async () => {
                    const result = await removeAvatarAction();
                    if (!result.ok) {
                      flash(false, result.error);
                      return;
                    }
                    setPreview(null);
                    flash(true, "Foto removida.");
                    router.refresh();
                  });
                }}
                className="rounded-full px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Remover
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <form
        className="x09-card rounded-[1.75rem] p-6 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          start(async () => {
            const result = await updateProfileAction(data);
            if (!result.ok) {
              flash(false, result.error);
              return;
            }
            flash(true, "Dados salvos.");
            router.refresh();
          });
        }}
      >
        <h2 className="text-lg font-semibold text-white">Os seus dados</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Usamos isto na conta e, mais tarde, nos sites que você criar.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm text-zinc-400">
            Nome
            <input
              name="fullName"
              required
              defaultValue={profile.fullName}
              className={fieldClass}
            />
          </label>
          <label className="sm:col-span-2 text-sm text-zinc-400">
            E-mail
            <input
              value={email}
              readOnly
              className={`${fieldClass} cursor-not-allowed opacity-70`}
            />
          </label>
          <label className="text-sm text-zinc-400">
            Telefone
            <input
              name="phone"
              defaultValue={profile.phone}
              placeholder="(48) 99999-0000"
              className={fieldClass}
            />
          </label>
          <label className="text-sm text-zinc-400">
            Empresa ou marca
            <input
              name="company"
              defaultValue={profile.company}
              className={fieldClass}
            />
          </label>
          <label className="sm:col-span-2 text-sm text-zinc-400">
            Endereço
            <input
              name="addressLine"
              defaultValue={profile.addressLine}
              className={fieldClass}
            />
          </label>
          <label className="text-sm text-zinc-400">
            Cidade
            <input name="city" defaultValue={profile.city} className={fieldClass} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm text-zinc-400">
              UF
              <input
                name="state"
                defaultValue={profile.state}
                maxLength={2}
                className={fieldClass}
              />
            </label>
            <label className="text-sm text-zinc-400">
              CEP
              <input
                name="postalCode"
                defaultValue={profile.postalCode}
                className={fieldClass}
              />
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="x09-button-primary mt-6 px-5 py-2.5 text-sm disabled:opacity-50"
        >
          Salvar dados
        </button>
      </form>

      <form
        className="x09-card rounded-[1.75rem] p-6 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          start(async () => {
            const result = await updatePasswordAction(data);
            if (!result.ok) {
              flash(false, result.error);
              return;
            }
            form.reset();
            flash(true, "Senha alterada.");
          });
        }}
      >
        <h2 className="text-lg font-semibold text-white">Senha</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Precisa da senha atual. A nova tem de ter pelo menos 8 caracteres.
        </p>
        <div className="mt-6 grid gap-4 sm:max-w-md">
          <label className="text-sm text-zinc-400">
            Senha atual
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              className={fieldClass}
            />
          </label>
          <label className="text-sm text-zinc-400">
            Senha nova
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={fieldClass}
            />
          </label>
          <label className="text-sm text-zinc-400">
            Confirmar senha nova
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={fieldClass}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="x09-button-secondary mt-6 px-5 py-2.5 text-sm disabled:opacity-50"
        >
          Alterar senha
        </button>
      </form>
    </div>
  );
}
