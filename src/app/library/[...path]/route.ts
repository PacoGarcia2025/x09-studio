import { NextResponse } from "next/server";
import {
  libraryFileResponse,
  resolvePublishedLibraryFile,
} from "@/lib/assets/published-library.server";
import { sanitizeLibraryFilename } from "@/lib/assets/project-library-catalog";
import { extractPublishSlugFromHost } from "@/lib/projects/publish-url";

export const dynamic = "force-dynamic";

type Params = { path?: string[] };

export async function GET(
  request: Request,
  context: { params: Promise<Params> },
) {
  const { path } = await context.params;
  const filename = sanitizeLibraryFilename((path ?? []).join("/"));
  if (!filename) {
    return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
  }

  const headerSlug = request.headers.get("x-publish-slug")?.trim().toLowerCase();
  const slug =
    (headerSlug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(headerSlug)
      ? headerSlug
      : null) ?? extractPublishSlugFromHost(request.headers.get("host") ?? "");

  if (!slug) {
    return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });
  }

  const file = await resolvePublishedLibraryFile({ slug, filename });
  if (!file) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return libraryFileResponse(file);
}
