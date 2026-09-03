import { NextResponse } from "next/server";
import {
  libraryFileResponse,
  resolvePublishedLibraryFile,
} from "@/lib/assets/published-library.server";
import { sanitizeLibraryFilename } from "@/lib/assets/project-library-catalog";

export const dynamic = "force-dynamic";

type Params = { slug: string; path?: string[] };

export async function GET(
  _request: Request,
  context: { params: Promise<Params> },
) {
  const { slug, path } = await context.params;
  const filename = sanitizeLibraryFilename((path ?? []).join("/"));
  if (!filename) {
    return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
  }

  const file = await resolvePublishedLibraryFile({ slug, filename });
  if (!file) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return libraryFileResponse(file);
}
