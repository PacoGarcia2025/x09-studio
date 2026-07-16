import {
  AtSign,
  ImageIcon,
  Mail,
  Phone,
  User,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUserStore, type UserProfile } from "@/store/user-store";

type UserProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

const fields: Array<{
  key: keyof UserProfile;
  label: string;
  placeholder: string;
  type?: string;
  icon: typeof User;
}> = [
  { key: "name", label: "Nome", placeholder: "Seu nome ou da empresa", icon: User },
  {
    key: "email",
    label: "E-mail",
    placeholder: "contato@empresa.com",
    type: "email",
    icon: Mail,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    placeholder: "(11) 99999-9999",
    icon: Phone,
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "@seu_perfil",
    icon: AtSign,
  },
  {
    key: "logoUrl",
    label: "URL da Logo",
    placeholder: "https://.../logo.png",
    icon: ImageIcon,
  },
];

export function UserProfileModal({ open, onClose }: UserProfileModalProps) {
  const profile = useUserStore();
  const updateProfile = useUserStore((state) => state.updateProfile);

  const [form, setForm] = useState<UserProfile>({
    name: profile.name,
    email: profile.email,
    whatsapp: profile.whatsapp,
    instagram: profile.instagram,
    logoUrl: profile.logoUrl,
  });

  // Sincroniza o form com o store toda vez que o modal abre
  useEffect(() => {
    if (open) {
      setForm({
        name: profile.name,
        email: profile.email,
        whatsapp: profile.whatsapp,
        instagram: profile.instagram,
        logoUrl: profile.logoUrl,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fecha com ESC
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleChange(key: keyof UserProfile, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateProfile(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-glow">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-transparent" />

        <div className="relative flex items-start justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-glow">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary">Meu Perfil</h2>
              <p className="text-xs text-secondary">
                Dados usados pela IA para personalizar seus sites.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          {form.logoUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
              <img
                src={form.logoUrl}
                alt="Prévia da logo"
                className="h-12 w-12 rounded-lg object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <p className="text-xs text-secondary">Prévia da logo</p>
            </div>
          ) : null}

          {fields.map(({ key, label, placeholder, type, icon: Icon }) => (
            <div key={key} className="space-y-1.5">
              <label
                htmlFor={`profile-${key}`}
                className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-secondary"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </label>
              <Input
                id={`profile-${key}`}
                type={type ?? "text"}
                value={form[key]}
                placeholder={placeholder}
                onChange={(event) => handleChange(key, event.target.value)}
              />
            </div>
          ))}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className={cn(
                "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white",
                "shadow-glow hover:from-violet-500 hover:to-fuchsia-500",
              )}
            >
              <AtSign className="h-4 w-4" />
              Salvar Perfil
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
