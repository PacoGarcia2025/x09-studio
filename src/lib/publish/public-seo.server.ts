import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { SeoPageRow } from "@/lib/publish/seo-pages.server";

export type { SeoPageRow };

export async function getPublicSeoPage(
  slug: string,
  path: string,
): Promise<SeoPageRow | null> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("published_seo_pages")
    .select(
      "project_slug, path, title, description, og_image, price_brl, json_ld",
    )
    .eq("project_slug", slug.toLowerCase())
    .eq("path", normalized)
    .maybeSingle();

  if (error || !data) return null;
  return data as SeoPageRow;
}
