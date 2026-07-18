import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";
  const origin = url.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Prefer Visual MVP origin when configured
      const mvp =
        process.env.NEXT_PUBLIC_VISUAL_MVP_URL?.trim() ||
        process.env.VISUAL_MVP_URL?.trim();
      if (mvp) {
        return NextResponse.redirect(new URL("/", mvp));
      }
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(
    new URL("/?auth_error=callback", origin),
  );
}
