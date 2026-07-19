import { redirect } from "next/navigation";
import { createProjectFromPrompt } from "@/lib/projects/actions";

export const dynamic = "force-dynamic";

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
    redirect(`/projects?createError=${encodeURIComponent(result.error)}#prompt`);
  }

  redirect(
    `/projects/${result.projectId}?autostart=${result.planReady ? "1" : "0"}`,
  );
}
