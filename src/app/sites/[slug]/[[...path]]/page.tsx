import type { Metadata } from "next";
import { PublicSitePreview } from "@/components/sites/PublicSitePreview";
import { getPublishedSiteFiles } from "@/lib/projects/public-site.actions";
import { getPublicSeoPage } from "@/lib/publish/public-seo.server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string; path?: string[] }>;
};

function pathnameFromSegments(path?: string[]): string {
  if (!path?.length) return "/";
  return `/${path.join("/")}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, path } = await params;
  const pathname = pathnameFromSegments(path);
  const seo = await getPublicSeoPage(slug, pathname);

  if (!seo) {
    return { title: slug };
  }

  const images = seo.og_image ? [{ url: seo.og_image }] : undefined;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.title,
      description: seo.description,
      images,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: seo.og_image ? [seo.og_image] : undefined,
    },
  };
}

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
    <PublicSitePreview files={result.files} title={result.project.name} />
  );
}
