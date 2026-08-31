import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";
import { authConnectivityMessage } from "@/lib/supabase/route-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = getSupabaseUrl();
  const publishable = getSupabasePublishableKey();

  try {
    const client = createClient(url, publishable, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const health = await client.auth.getSession();

    if (health.error && /fetch failed|ENOTFOUND/i.test(health.error.message)) {
      return NextResponse.json(
        {
          ok: false,
          error: authConnectivityMessage(health.error),
          urlHost: new URL(url).host,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      urlHost: new URL(url).host,
      authReachable: true,
    });
  } catch (cause) {
    return NextResponse.json(
      {
        ok: false,
        error: authConnectivityMessage(cause),
        urlHost: safeHost(url),
      },
      { status: 503 },
    );
  }
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
