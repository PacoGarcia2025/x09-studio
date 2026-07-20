import { PublicSitePreview } from "@/components/sites/PublicSitePreview";
import { getPublishedSiteFiles } from "@/lib/projects/public-site.actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicSitePage({ params }: Props) {
  const { slug } = await params;
  const result = await getPublishedSiteFiles(slug);

  if (!result.ok) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-50 px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Site indisponível</h1>
          <p className="mt-2 text-sm text-zinc-500">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <PublicSitePreview
      files={result.files}
      title={result.project.name}
    />
  );
}
