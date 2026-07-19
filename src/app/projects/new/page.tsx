import { redirect } from "next/navigation";
import { createProjectFromPrompt } from "@/lib/projects/actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const prompt = q?.trim() ?? "";

  if (!prompt) redirect("/projects#prompt");

  const result = await createProjectFromPrompt(prompt);
  if (!result.ok) {
    redirect(
      `/projects?createError=${encodeURIComponent(result.error)}#prompt`,
    );
  }

  // Plano/build rodam no editor (evita timeout nesta rota).
  redirect(
    `/projects/${result.projectId}?autostart=1&q=${encodeURIComponent(prompt)}`,
  );
}
