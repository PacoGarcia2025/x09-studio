import { NextResponse } from "next/server";
import { getPublicSeoPage } from "@/lib/publish/public-seo.server";

export const dynamic = "force-dynamic";

type Params = { slug: string };

/** API pública para Cloudflare Worker ou integrações — SEO por rota. */
export async function GET(
  request: Request,
  ctx: { params: Promise<Params> },
) {
  const { slug } = await ctx.params;
  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "/";

  const seo = await getPublicSeoPage(slug, path);
  if (!seo) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(seo, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
