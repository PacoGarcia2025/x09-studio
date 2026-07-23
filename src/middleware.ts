import { type NextRequest, NextResponse } from "next/server";
import { extractPublishSlugFromHost } from "@/lib/projects/publish-url";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // APIs (ex.: /api/leads/visit) não devem ser reescritas para /sites/{slug}.
  if (pathname.startsWith("/api/")) {
    return updateSession(request);
  }

  const slugFromHeader = request.headers.get("x-publish-slug")?.trim().toLowerCase();
  const slug =
    (slugFromHeader && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugFromHeader)
      ? slugFromHeader
      : null) ?? extractPublishSlugFromHost(request.headers.get("host") ?? "");
  if (slug) {
    const url = request.nextUrl.clone();
    const sitePrefix = `/sites/${slug}`;
    // Nginx fallback já encaminha para /sites/{slug} — evita reescrita duplicada.
    if (
      url.pathname === sitePrefix ||
      url.pathname.startsWith(`${sitePrefix}/`)
    ) {
      return updateSession(request);
    }
    const subPath =
      url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    url.pathname = `${sitePrefix}${subPath}`;
    return NextResponse.rewrite(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
