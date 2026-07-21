import { type NextRequest, NextResponse } from "next/server";
import { extractPublishSlugFromHost } from "@/lib/projects/publish-url";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // APIs (ex.: /api/leads/visit) não devem ser reescritas para /sites/{slug}.
  if (pathname.startsWith("/api/")) {
    return updateSession(request);
  }

  const slug = extractPublishSlugFromHost(request.headers.get("host") ?? "");
  if (slug) {
    const url = request.nextUrl.clone();
    const subPath =
      url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    url.pathname = `/sites/${slug}${subPath}`;
    return NextResponse.rewrite(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
