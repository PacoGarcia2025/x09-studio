import "server-only";

import { extractListingsJsonLd } from "@/lib/publish/seo-meta";
import { createAdminClient } from "@/lib/supabase/admin";
import { readProjectFile, fileExists } from "@/lib/projects/fs.server";

export type SeoPageRow = {
  project_slug: string;
  path: string;
  title: string;
  description: string;
  og_image: string | null;
  price_brl: number | null;
  json_ld: unknown | null;
};

function parsePropertyBlocks(source: string): Array<{
  id: string;
  title: string;
  description: string;
  price: number;
  image: string | null;
}> {
  const items: Array<{
    id: string;
    title: string;
    description: string;
    price: number;
    image: string | null;
  }> = [];

  const idRe = /id:\s*["']([^"']+)["']/g;
  const ids = [...source.matchAll(idRe)].map((m) => m[1]!);

  for (const id of ids) {
    const chunk = source.slice(
      source.indexOf(`id: "${id}"`) >= 0
        ? source.indexOf(`id: "${id}"`)
        : source.indexOf(`id: '${id}'`),
      source.indexOf(`id: "${id}"`) >= 0
        ? source.indexOf(`id: "${id}"`) + 800
        : source.indexOf(`id: '${id}'`) + 800,
    );
    const title = chunk.match(/title:\s*["']([^"']+)["']/)?.[1] ?? "Imóvel";
    const description =
      chunk.match(/description:\s*["']([^"']+)["']/)?.[1] ?? title;
    const price = Number(chunk.match(/price:\s*([\d_]+)/)?.[1]?.replace(/_/g, "") ?? 0);
    const image =
      chunk.match(/https:\/\/images\.unsplash\.com[^"']+/)?.[0] ?? null;
    items.push({ id, title, description, price, image });
  }

  return items;
}

/** Sincroniza páginas SEO no Supabase para Worker / generateMetadata. */
export async function syncPublishedSeoPages(input: {
  projectId: string;
  projectSlug: string;
  projectName: string;
  siteUrl: string;
  briefDescription: string;
}): Promise<number> {
  const admin = createAdminClient();
  const rows: Array<{
    project_id: string;
    project_slug: string;
    path: string;
    title: string;
    description: string;
    og_image: string | null;
    price_brl: number | null;
    json_ld: unknown | null;
  }> = [
    {
      project_id: input.projectId,
      project_slug: input.projectSlug,
      path: "/",
      title: input.projectName,
      description: input.briefDescription,
      og_image: null,
      price_brl: null,
      json_ld: null,
    },
    {
      project_id: input.projectId,
      project_slug: input.projectSlug,
      path: "/imoveis",
      title: `Catálogo — ${input.projectName}`,
      description: input.briefDescription,
      og_image: null,
      price_brl: null,
      json_ld: null,
    },
  ];

  if (await fileExists(input.projectId, "src/lib/properties.ts")) {
    const src = await readProjectFile(input.projectId, "src/lib/properties.ts");
    for (const p of parsePropertyBlocks(src)) {
      rows.push({
        project_id: input.projectId,
        project_slug: input.projectSlug,
        path: `/imovel/${p.id}`,
        title: `${p.title} — ${input.projectName}`,
        description: p.description,
        og_image: p.image,
        price_brl: p.price || null,
        json_ld: {
          "@context": "https://schema.org",
          "@type": "RealEstateListing",
          name: p.title,
          description: p.description,
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: "BRL",
          },
        },
      });
    }

    const jsonLd = extractListingsJsonLd(src, input.projectName, input.siteUrl);
    if (jsonLd) {
      rows[0]!.json_ld = JSON.parse(jsonLd);
    }
  }

  await admin
    .from("published_seo_pages")
    .delete()
    .eq("project_id", input.projectId);

  const { error } = await admin.from("published_seo_pages").insert(rows);
  if (error) {
    throw new Error(`Falha ao sincronizar SEO: ${error.message}`);
  }

  return rows.length;
}
