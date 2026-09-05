import { ProjectLivePreview } from "@/components/projects/ProjectLivePreview";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Preview",
};

export default async function ProjectCardFramePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectLivePreview projectId={id} variant="card" />;
}
