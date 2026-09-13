import { supabase } from "@/lib/supabase";

export type UploadedAttachment = {
  id: string;
  kind: string;
  name: string;
  url: string;
};

function apiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined;
  if (env && env.trim()) return env.replace(/\/$/, "");
  return "";
}

export class UploadError extends Error {}

/** Envia um anexo (imagem/vídeo) do chat pro BFF — vira asset da biblioteca do workspace. */
export async function uploadChatAttachment(
  file: File,
  signal?: AbortSignal,
): Promise<UploadedAttachment> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new UploadError("Faça login para anexar arquivos.");
  }

  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${apiBase()}/api/assets/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal,
  });

  if (!response.ok) {
    let message = `Falha no upload (${response.status})`;
    try {
      const parsed = (await response.json()) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      // ignore
    }
    throw new UploadError(message);
  }

  return (await response.json()) as UploadedAttachment;
}
