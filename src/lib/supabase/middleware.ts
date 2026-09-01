import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/auth/paths";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/signup";
  // Páginas Next usam sessão por cookie. APIs do Visual MVP validam o Bearer
  // Supabase dentro de cada handler; redirecioná-las aqui quebraria clientes
  // Vite autenticados que não compartilham o cookie SSR.
  const isProtected =
    path.startsWith("/projects") ||
    path.startsWith("/billing") ||
    path.startsWith("/assets");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const nextPath =
      request.nextUrl.pathname + (request.nextUrl.search || "");
    url.searchParams.set("next", nextPath);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const destination = sanitizeNextPath(nextParam);
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return supabaseResponse;
}
